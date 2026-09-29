import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publicApiPost } from '@/lib/api';
import { createOtp, verifyOtp, createSession, checkBruteForce, recordFailure, clearFailures } from '@/lib/auth/service';
import { setSessionCookie } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
import { getRepo } from '@/lib/db/repo';

const RequestSchema = z.object({ action: z.literal('request'), email: z.string().email().max(200) });
const VerifySchema = z.object({ action: z.literal('verify'), email: z.string().email().max(200), code: z.string().regex(/^\d{6}$/) });
const Schema = z.union([RequestSchema, VerifySchema]);

export const POST = publicApiPost(Schema, async ({ req }, d) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (d.action === 'request') {
    if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY && !process.env.EMAIL_API_KEY) {
      return NextResponse.json({ ok: false, error: 'Email sign-in is not configured yet. Use your password or try again later.' }, { status: 503 });
    }
    // Same response whether or not the account exists (enumeration protection).
    const repo = await getRepo();
    const user = await repo.findOne('user', { email: d.email.toLowerCase() });
    if (user && !user.deletedAt) {
      const { code } = await createOtp(String(user.id));
      const { sendEmail } = await import('@/lib/notifications/email');
      await sendEmail(d.email, 'Your TaxOS sign-in code',
        `<div style="font-family:sans-serif"><p>Your one-time sign-in code is <b>${code}</b>. It expires in 10 minutes.</p><p style="color:#9ca3af;font-size:12px">TaxOS will never ask for your Income Tax Department password.</p></div>`
      ).catch(() => {});
      // Dev convenience ONLY outside production so the flow is testable without an email provider.
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ ok: true, devCode: code, message: 'Code sent.' });
      }
    }
    return NextResponse.json({ ok: true, message: 'If an account exists for this email, a 6-digit code is on its way. Codes expire in 10 minutes.' });
  }

  const bf = checkBruteForce(`otp:${d.email}`);
  if (bf.blocked) return NextResponse.json({ ok: false, error: `Too many incorrect codes. Try again in ${bf.retryAfterSec}s.` }, { status: 429 });
  const r = await verifyOtp(d.email, d.code);
  if (!r.ok || !r.user) { recordFailure(`otp:${d.email}`); return NextResponse.json({ ok: false, error: r.error }, { status: 401 }); }
  clearFailures(`otp:${d.email}`);
  await audit(r.user.id, 'LOGIN');
  const token = await createSession(r.user.id, ip ?? undefined);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, user: r.user, next: '/app' });
}, { limit: 15, windowMs: 10 * 60_000, namespace: 'otp' });
