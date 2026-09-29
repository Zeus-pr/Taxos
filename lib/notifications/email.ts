/**
 * Email notifications (§47). Provider-agnostic: Resend/SES/Postmark via HTTP when EMAIL_API_KEY is set,
 * otherwise logs to console in dev. NEVER include sensitive tax values in emails (§47).
 */
async function post(url: string, key: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'TaxOS <notify@taxos.local>';
  if (process.env.RESEND_API_KEY) {
    await post('https://api.resend.com/emails', process.env.RESEND_API_KEY, { from, to, subject, html });
    return;
  }
  if (process.env.EMAIL_API_KEY) {
    // Generic HTTPS email endpoint compatible with most transactional providers.
    await post(process.env.EMAIL_ENDPOINT ?? 'https://api.postmarkapp.com/email', process.env.EMAIL_API_KEY, { From: from, To: to, Subject: subject, HtmlBody: html });
    return;
  }
  console.log(`[email:dev] to=${to.split('@')[0]}*** subject="${subject}"`);
}

const shell = (title: string, body: string) =>
  `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px">
     <div style="font-weight:700;font-size:18px;letter-spacing:-0.02em">TaxOS</div>
     <h2 style="font-size:16px;margin:16px 0 8px">${title}</h2>
     <div style="font-size:14px;color:#374151;line-height:1.6">${body}</div>
     <p style="font-size:11px;color:#9ca3af;margin-top:24px">TaxOS is an independent preparation assistant and is not affiliated with the Income Tax Department. Do not reply with sensitive financial details.</p>
   </div>`;

export const templates = {
  welcome: () => shell('Welcome to TaxOS', 'Your workspace is ready. Start by completing your tax profile and uploading Form 16 or AIS.'),
  documentProcessed: (name: string) => shell('Document processed', `Your ${name} has been processed. Open TaxOS to review the extracted values — some fields may need confirmation.`),
  mismatchDetected: () => shell('Something needs your attention', 'We found information across two sources that does not fully match. Review it in Reconciliation.'),
  incompleteProfile: () => shell('Your tax profile is incomplete', 'A few items are still missing. Completing them keeps your estimate accurate.'),
  subscriptionConfirmed: (plan: string) => shell('Subscription active', `TaxOS ${plan} is now active on your account.`),
  securityAlert: () => shell('Security alert', 'Multiple failed sign-in attempts were detected for your account. If this was not you, reset your password.'),
};
