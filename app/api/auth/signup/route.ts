import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publicApiPost } from '@/lib/api';
import { register, createSession } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';

const Schema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(10).max(200), name: z.string().trim().min(2).max(80) });

export const POST = publicApiPost(Schema, async ({ req }, d) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const r = await register(d.email, d.password, d.name);
  if (!r.ok || !r.user) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  const token = await createSession(r.user.id, ip);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, user: r.user, next: '/app/onboarding' });
}, { limit: 10, windowMs: 60 * 60_000, namespace: 'signup' });
