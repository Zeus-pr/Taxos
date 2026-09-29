import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookie, SESSION_COOKIE } from '@/lib/auth/session';
import { destroySession } from '@/lib/auth/service';
import { currentUser } from '@/lib/api';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await currentUser(req as any);
  if (token) await destroySession(token);
  if (user) await audit(user.id, 'LOGOUT');
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
