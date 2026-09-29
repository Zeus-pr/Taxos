/** Auth service: email/password, Google OAuth (id-token verification), email OTP. Sessions are server-side hashed tokens (§7). */
import bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { getRepo } from '../db/repo';
import { hashToken, newSessionToken, sessionExpiry } from './session';
import { audit } from '../audit';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface SessionUser { id: string; email: string; name: string | null; role: string; plan: string; }

const failedAttempts = new Map<string, { count: number; until: number }>(); // brute-force protection (§38)
const googleSigningKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export function checkBruteForce(key: string): { blocked: boolean; retryAfterSec?: number } {
  const rec = failedAttempts.get(key);
  if (rec && rec.until > Date.now()) return { blocked: true, retryAfterSec: Math.ceil((rec.until - Date.now()) / 1000) };
  return { blocked: false };
}
export function recordFailure(key: string) {
  const rec = failedAttempts.get(key) ?? { count: 0, until: 0 };
  rec.count++;
  if (rec.count >= 5) { rec.until = Date.now() + 15 * 60 * 1000; rec.count = 0; }
  failedAttempts.set(key, rec);
}
export function clearFailures(key: string) { failedAttempts.delete(key); }

export async function register(email: string, password: string, name?: string): Promise<{ ok: boolean; error?: string; user?: SessionUser }> {
  const repo = await getRepo();
  const existing = await repo.findOne('user', { email: email.toLowerCase() });
  if (existing && !existing.deletedAt) return { ok: false, error: 'An account with this email already exists. Try signing in.' };
  const passwordHash = await bcrypt.hash(password, 12);
  const user = existing
    ? await repo.update('user', existing.id, { passwordHash, deletedAt: null, name: name ?? existing.name })
    : await repo.insert('user', { email: email.toLowerCase(), passwordHash, name: name ?? null, role: 'USER', plan: 'FREE' });
  if (!user) return { ok: false, error: 'We could not restore this account. Please try again.' };
  await audit(user.id, 'SIGNUP');
  return { ok: true, user: toSessionUser(user) };
}

export async function loginWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: SessionUser }> {
  const repo = await getRepo();
  const user = await repo.findOne('user', { email: email.toLowerCase() });
  if (!user || user.deletedAt) return { ok: false, error: 'We couldn\'t find an account with those details.' };
  const ok = await bcrypt.compare(password, String(user.passwordHash ?? ''));
  if (!ok) return { ok: false, error: 'Incorrect password.' };
  await audit(user.id, 'LOGIN');
  return { ok: true, user: toSessionUser(user) };
}

/** Verify the Google ID token signature and claims before using its stable subject as the account identity. */
export async function loginWithGoogleIdToken(idToken: string): Promise<{ ok: boolean; error?: string; user?: SessionUser }> {
  const expectedAud = process.env.GOOGLE_CLIENT_ID;
  if (!expectedAud) return { ok: false, error: 'Google sign-in is not configured yet.' };

  let claims;
  try {
    ({ payload: claims } = await jwtVerify(idToken, googleSigningKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: expectedAud,
    }));
  } catch {
    return { ok: false, error: 'Google sign-in could not be verified. Please try again.' };
  }

  const sub = typeof claims.sub === 'string' ? claims.sub : '';
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  const verifiedEmail = claims.email_verified === true || claims.email_verified === 'true';
  if (!sub || !email || !verifiedEmail) return { ok: false, error: 'Google did not provide a verified email address.' };

  const repo = await getRepo();
  let user = await repo.findOne('user', { googleSub: sub });
  const emailOwner = await repo.findOne('user', { email });

  if (user && emailOwner && emailOwner.id !== user.id) {
    return { ok: false, error: 'This Google account cannot be linked to the existing TaxOS account. Sign in with your current method first.' };
  }

  if (!user && emailOwner?.googleSub && emailOwner.googleSub !== sub) {
    return { ok: false, error: 'This email is already linked to another Google account.' };
  }

  if (!user && emailOwner) {
    user = await repo.update('user', emailOwner.id, {
      googleSub: sub,
      name: typeof claims.name === 'string' ? claims.name : emailOwner.name,
      deletedAt: null,
    });
  } else if (!user) {
    user = await repo.insert('user', { email, googleSub: sub, name: typeof claims.name === 'string' ? claims.name : null, role: 'USER', plan: 'FREE', passwordHash: null });
    await audit(user.id, 'SIGNUP');
  } else {
    user = await repo.update('user', user.id, {
      email,
      name: typeof claims.name === 'string' ? claims.name : user.name,
      deletedAt: null,
    });
  }
  if (!user) return { ok: false, error: 'We could not finish signing you in. Please try again.' };
  await audit(user.id, 'LOGIN');
  return { ok: true, user: toSessionUser(user) };
}

export async function createOtp(userId: string): Promise<{ code: string; expiresAt: string }> {
  // 6-digit OTP; only its bcrypt hash is stored (§7 — never store OTPs themselves).
  const code = String(randomInt(100000, 999999));
  const repo = await getRepo();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await repo.remove('otpCode', { userId });
  await repo.insert('otpCode', { userId, codeHash, expiresAt, attempts: 0, consumed: false });
  return { code, expiresAt };
}

export async function verifyOtp(email: string, code: string): Promise<{ ok: boolean; error?: string; user?: SessionUser }> {
  const repo = await getRepo();
  const user = await repo.findOne('user', { email: email.toLowerCase() });
  if (!user || user.deletedAt) return { ok: false, error: 'No account found for this email.' };
  const otps = await repo.findMany('otpCode', { userId: user.id, consumed: false });
  const active = otps.filter(o => new Date(String(o.expiresAt)).getTime() > Date.now());
  if (!active.length) return { ok: false, error: 'That code has expired. Request a new one.' };
  for (const o of active) {
    if (Number(o.attempts) >= 5) continue;
    if (await bcrypt.compare(code, String(o.codeHash))) {
      await repo.update('otpCode', o.id, { consumed: true });
      // LOGIN audit is emitted by verifyOtp caller (session route).
      return { ok: true, user: toSessionUser(user) };
    }
    await repo.update('otpCode', o.id, { attempts: Number(o.attempts) + 1 });
  }
  return { ok: false, error: 'Incorrect code. Please check and try again.' };
}

export async function createSession(userId: string, ip?: string, userAgent?: string): Promise<string> {
  const repo = await getRepo();
  const token = newSessionToken();
  await repo.insert('session', { userId, tokenHash: hashToken(token), expiresAt: sessionExpiry().toISOString(), ip: ip ?? null, userAgent: userAgent ?? null });
  return token;
}

export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const repo = await getRepo();
  const session = await repo.findOne('session', { tokenHash: hashToken(token) });
  if (!session) return null;
  if (new Date(String(session.expiresAt)).getTime() < Date.now()) {
    await repo.remove('session', { id: session.id });
    return null;
  }
  const user = await repo.findOne('user', { id: session.userId as string });
  if (!user || user.deletedAt) return null;
  return toSessionUser(user);
}

export async function destroySession(token: string) {
  const repo = await getRepo();
  await repo.remove('session', { tokenHash: hashToken(token) });
}

export async function destroyAllSessions(userId: string) {
  const repo = await getRepo();
  await repo.remove('session', { userId });
}

function toSessionUser(u: { id: unknown; [key: string]: unknown }): SessionUser {
  return { id: String(u.id), email: String(u.email), name: u.name ? String(u.name) : null, role: String(u.role ?? 'USER'), plan: String(u.plan ?? 'FREE') };
}

export function hashForLog(x: string) { return createHash('sha256').update(x).digest('hex').slice(0, 12); }
