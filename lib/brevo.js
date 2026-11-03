/**
 * lib/brevo.js
 * Send transactional emails via Brevo (formerly Sendinblue).
 * Uses the REST API directly — no SDK needed.
 *
 * Env vars:
 *   BREVO_API_KEY       — required
 *   BREVO_SENDER_EMAIL  — the verified sender in Brevo. Use an address on your
 *                         own domain (e.g. hello@100gigs.ng) once you have one;
 *                         @gmail.com senders often land in spam.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'izzythedev@gmail.com';

/** Makes user-supplied text safe to put inside HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Send an email via Brevo.
 * @param {object} options
 * @param {string} options.to      - recipient email
 * @param {string} options.name    - recipient name
 * @param {string} options.subject - email subject
 * @param {string} options.html    - HTML body
 * @param {string} [options.text]  - plain-text body (helps keep mail out of spam)
 */
export async function sendEmail({ to, name, subject, html, text }) {
  if (!process.env.BREVO_API_KEY) throw new Error('BREVO_API_KEY is not set');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: '100Gigs', email: SENDER_EMAIL },
        to: [{ email: to, name: String(name || to).slice(0, 70) }],
        subject,
        htmlContent: html,
        ...(text ? { textContent: text } : {}),
      }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Brevo error: ${data.message || res.statusText}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send the password reset email.
 * @param {string} to        - user email
 * @param {string} name      - user name
 * @param {string} resetUrl  - full reset link
 */
export async function sendPasswordResetEmail(to, name, resetUrl) {
  // The name comes from whoever created the account, so it must never be
  // able to inject links or markup into an email sent from 100Gigs.
  const firstName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'there');
  const url = escapeHtml(resetUrl);
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <title>Reset your 100Gigs password</title>
</head>
<body style="margin:0;padding:0;background:#080f0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080f0a;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

          <tr>
            <td style="padding:0 0 40px 0;font-size:22px;font-weight:600;letter-spacing:-0.3px;color:#e9efe9;">
              <span style="color:#4ade80;">100</span>Gigs
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #1f2b22;padding:32px 0 0 0;">
              <p style="margin:0 0 12px 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b7a6e;">
                Password reset
              </p>
              <h1 style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.1;font-weight:400;color:#e9efe9;">
                Choose a new password.
              </h1>
              <p style="margin:0 0 32px 0;font-size:15px;line-height:1.6;color:#a3b0a6;">
                Hi ${firstName}, someone asked to reset the password on your 100Gigs account.
                If it was you, use the button below. The link works once and expires in 1&nbsp;hour.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:999px;background:#4ade80;">
                    <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#080f0a;text-decoration:none;border-radius:999px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0 0;font-size:13px;line-height:1.6;color:#6b7a6e;">
                Didn’t ask for this? Ignore this email. Your password won’t change.
              </p>
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #1f2b22;padding:24px 0 0 0;margin-top:32px;">
              <p style="margin:32px 0 6px 0;font-size:12px;color:#6b7a6e;">If the button doesn’t work, paste this into your browser:</p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:#4ade80;">${url}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 0 0 0;font-size:12px;color:#4a564d;">
              © ${year} 100Gigs
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${String(name || '').trim().split(/\s+/)[0] || 'there'},`,
    '',
    'Someone asked to reset the password on your 100Gigs account.',
    'If it was you, open this link (works once, expires in 1 hour):',
    '',
    resetUrl,
    '',
    'Didn’t ask for this? Ignore this email. Your password won’t change.',
    '',
    '— 100Gigs',
  ].join('\n');

  return sendEmail({
    to,
    name,
    subject: 'Reset your 100Gigs password',
    html,
    text,
  });
}