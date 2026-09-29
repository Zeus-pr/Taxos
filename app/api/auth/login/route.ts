import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publicApiPost } from '@/lib/api';
import { loginWithPassword, createSession, checkBruteForce, recordFailure, clearFailures } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';
import { audit } from '@/lib/audit';

const Schema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) });

export const POST = publicApiPost(Schema, async ({ req }, d) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const bf = checkBruteForce(`em:${d.email}`);
  if (bf.blocked) return NextResponse.json({ ok: false, error: `Too many failed attempts. Try again in ${bf.retryAfterSec}s.` }, { status: 429 });
  const r = await loginWithPassword(d.email, d.password);
  if (!r.ok || !r.user) {
    recordFailure(`em:${d.email}`);
    await audit(null, 'LOGIN_FAILED');
    return NextResponse.json({ ok: false, error: r.error ?? 'We could not sign you in. Check your email and password.' }, { status: 401 });
  }
  clearFailures(`em:${d.email}`);
  const token = await createSession(r.user.id, ip);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, user: r.user, next: '/app' });
}, { limit: 20, windowMs: 5 * 60_000, namespace: 'login' });
