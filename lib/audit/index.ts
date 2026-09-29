/**
 * Audit logging (§37). Records events; NEVER records passwords, OTPs, API keys or document contents.
 */
import { getRepo } from '@/lib/db/repo';

export type AuditEvent =
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'SIGNUP'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_DELETED' | 'DOCUMENT_PROCESSED' | 'DOCUMENT_EXTRACTION'
  | 'USER_CORRECTION' | 'TAX_CALCULATION' | 'RECONCILIATION' | 'EXPORT'
  | 'SUBSCRIPTION_EVENT' | 'RULE_VIEWED' | 'ACCOUNT_EXPORT' | 'ACCOUNT_DELETION'
  | 'PROFILE_UPDATED' | 'ONBOARDING_COMPLETED';

export async function audit(
  userId: string | null,
  event: AuditEvent,
  meta?: Record<string, string | number | boolean | null>,
) {
  // Sanitize: drop anything that looks sensitive.
  const safe: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    if (/password|otp|token|secret|key|pan|content/i.test(k)) continue;
    if (v === null || v === undefined) continue;
    safe[k] = v;
  }
  try {
    const repo = await getRepo();
    await repo.insert('auditLog', {
      userId,
      action: event,
      meta: safe,
      ip: null,
    });
  } catch (e) {
    // Audit must never break the request path; surface in server logs only.
    console.error('audit write failed', (e as Error).message);
  }
}
