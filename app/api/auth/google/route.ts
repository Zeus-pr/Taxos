/** Google OAuth (§7): verifies the ID token server-side against Google's documented tokeninfo endpoint (issuer + audience). No client-trusted identity. */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publicApiPost } from '@/lib/api';
import { loginWithGoogleIdToken, createSession } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';

const Schema = z.object({ idToken: z.string().min(20).max(4000) });

export const POST = publicApiPost(Schema, async ({ req }, d) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ ok: false, error: 'Google sign-in is not configured on this deployment yet. Use email/password or a sign-in code.' }, { status: 501 });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const r = await loginWithGoogleIdToken(d.idToken);
  if (!r.ok || !r.user) return NextResponse.json({ ok: false, error: r.error ?? 'Google sign-in could not be verified.' }, { status: 401 });
  const token = await createSession(r.user.id, ip ?? undefined);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, user: r.user, next: '/app' });
}, { limit: 10, windowMs: 10 * 60_000, namespace: 'google-login' });
