/**
 * API foundation (§59): authenticated + authorized + Zod-validated + rate-limited route helpers.
 * Every handler receives a session that has already been verified server-side.
 * Ownership rule (§38/§73): resources are ALWAYS loaded via userId from the session, never from client IDs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { getSessionUser, type SessionUser } from '@/lib/auth/service';
import { rateLimit } from '@/lib/rate-limit';
import { getRepo, type Row } from '@/lib/db/repo';

export interface Ctx {
  user: SessionUser;
  req: NextRequest;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'local'
  );
}

/** Public JSON POST handler for endpoints such as login, signup and OTP. */
export function publicApiPost(
  schema: ZodSchema,
  fn: (ctx: { req: NextRequest }, body: any) => Promise<Response>,
  opts?: { limit?: number; windowMs?: number; namespace?: string }
) {
  return async (req: NextRequest) => {
    const ip = clientIp(req);
    const rl = rateLimit(`public:${opts?.namespace ?? 'post'}:${ip}`, opts?.limit ?? 30, opts?.windowMs ?? 60_000);
    if (!rl.ok) return deny(429, 'Too many requests. Please wait a moment and try again.', { 'Retry-After': String(rl.retryAfterSec ?? 30) });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return deny(400, 'We could not read your request. Please refresh and try again.');
    }
    try {
      return await fn({ req }, schema.parse(body));
    } catch (e) {
      if (e instanceof ZodError) {
        return deny(400, e.errors.map(x => `${x.path.join('.')}: ${x.message}`).join('; '));
      }
      if (e instanceof HttpError) return deny(e.status, e.message);
      console.error('Public API error:', (e as Error).message);
      return deny(500, friendlyServerError(e));
    }
  };
}

function deny(status: number, error: string, extra?: Record<string, string>) {
  return NextResponse.json({ ok: false, error }, { status, headers: extra });
}

/** Authenticated JSON POST handler with Zod body validation and per-user rate limiting. */
export function apiPost(
  schema: ZodSchema,
  fn: (ctx: Ctx, body: any) => Promise<Response>,
  opts?: { limit?: number; windowMs?: number; admin?: boolean }
) {
  return async (req: NextRequest) => {
    const rl = rateLimit(`api:${opts?.admin ? 'admin' : 'user'}:${clientIp(req)}`, opts?.limit ?? 120, opts?.windowMs ?? 60_000);
    if (!rl.ok) return deny(429, 'Too many requests. Please wait a moment and try again.', { 'Retry-After': String(rl.retryAfterSec ?? 30) });

    const user = await currentUser(req);
    if (!user) return deny(401, 'Please sign in to continue.');
    if (opts?.admin && user.role !== 'ADMIN') return deny(403, 'This area is restricted.');

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return deny(400, 'We could not read your request. Please refresh and try again.');
    }
    try {
      const parsed = schema.parse(body);
      return await fn({ user, req }, parsed);
    } catch (e) {
      if (e instanceof ZodError) {
        return deny(400, e.errors.map(x => `${x.path.join('.')}: ${x.message}`).join('; '));
      }
      if (e instanceof HttpError) return deny(e.status, e.message);
      console.error('API error:', (e as Error).message);
      return deny(500, friendlyServerError(e));
    }
  };
}

/** Authenticated GET handler with per-user rate limiting. */
export function apiGet(fn: (ctx: Ctx) => Promise<Response>, opts?: { limit?: number; windowMs?: number; admin?: boolean }) {
  return async (req: NextRequest) => {
    const rl = rateLimit(`api:get:${clientIp(req)}`, opts?.limit ?? 240, opts?.windowMs ?? 60_000);
    if (!rl.ok) return deny(429, 'Too many requests. Please wait a moment and try again.', { 'Retry-After': String(rl.retryAfterSec ?? 30) });
    const user = await currentUser(req);
    if (!user) return deny(401, 'Please sign in to continue.');
    if (opts?.admin && user.role !== 'ADMIN') return deny(403, 'This area is restricted.');
    try {
      return await fn({ user, req });
    } catch (e) {
      if (e instanceof HttpError) return deny(e.status, e.message);
      console.error('API error:', (e as Error).message);
      return deny(500, friendlyServerError(e));
    }
  };
}

/** Upload endpoint helper — parses multipart form, still authenticated + rate limited (stricter). */
export function apiUpload(fn: (ctx: Ctx, form: FormData) => Promise<Response>) {
  return async (req: NextRequest) => {
    const rl = rateLimit(`upload:${clientIp(req)}`, 20, 10 * 60_000);
    if (!rl.ok) return deny(429, 'You are uploading very quickly. Please wait a few minutes.', { 'Retry-After': String(rl.retryAfterSec ?? 60) });
    const user = await currentUser(req);
    if (!user) return deny(401, 'Please sign in to continue.');
    try {
      const form = await req.formData();
      return await fn({ user, req }, form);
    } catch (e) {
      if (e instanceof HttpError) return deny(e.status, e.message);
      console.error('Upload error:', (e as Error).message);
      return deny(500, friendlyServerError(e));
    }
  };
}

export async function currentUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(token);
}

/** §56 — never "Something went wrong". */
function friendlyServerError(e: unknown): string {
  const msg = (e as Error)?.message ?? '';
  if (/password protected/i.test(msg)) return 'This file is password protected. Unlock it and upload again.';
  if (/unsupported/i.test(msg)) return 'We do not support this format yet. Try PDF, CSV or XLSX exports.';
  return 'We hit an unexpected problem while processing this. Your data was not lost — please try again, and contact support if it persists.';
}

/* ---------------- tenant-scoped loaders (§73) ---------------- */

export async function ownedRow(table: string, id: string, userId: string): Promise<Row> {
  const repo = await getRepo();
  const row = await repo.findOne(table, { id });
  if (!row || row.userId !== userId) throw new HttpError(404, 'Not found.');
  return row;
}

/** List all rows of a table for the current tenant only (§73). */
export async function tenantRows(table: string, userId: string, where: Record<string, unknown> = {}): Promise<Row[]> {
  const repo = await getRepo();
  return repo.findMany(table, { ...where, userId });
}

export function ok(data: unknown = {}) {
  return NextResponse.json({ ok: true, ...((data && typeof data === 'object' && !Array.isArray(data)) ? data : { data }) });
}
