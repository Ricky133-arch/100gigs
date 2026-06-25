/**
 * lib/brevo.js
 * Send transactional emails via Brevo (formerly Sendinblue).
 * Uses the REST API directly — no SDK needed.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send an email via Brevo.
 * @param {object} options
 * @param {string} options.to      - recipient email
 * @param {string} options.name    - recipient name
 * @param {string} options.subject - email subject
 * @param {string} options.html    - HTML body
 */
export async function sendEmail({ to, name, subject, html }) {
  const res = await fetch(BREVO_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key':       process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name:  '100Gigs',
        email: 'izzythedev@gmail.com', // change to your verified sender in Brevo
      },
      to: [{ email: to, name: name || to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Brevo error: ${error.message || res.statusText}`);
  }

  return res.json();
}

/**
 * Send the password reset email.
 * @param {string} to        - user email
 * @param {string} name      - user name
 * @param {string} resetUrl  - full reset link
 */
export async function sendPasswordResetEmail(to, name, resetUrl) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="margin:0;padding:0;background:#080f0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#080f0a;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

              <!-- Logo -->
              <tr>
                <td style="padding-bottom:32px;">
                  <span style="font-size:24px;font-weight:900;letter-spacing:-0.5px;">
                    <span style="color:#4ade80;">100</span><span style="color:#ffffff;">Gigs</span>
                  </span>
                </td>
              </tr>

              <!-- Card -->
              <tr>
                <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;">

                  <!-- Icon -->
                  <div style="width:56px;height:56px;background:rgba(74,222,128,0.12);border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
                    <span style="font-size:28px;">🔐</span>
                  </div>

                  <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px 0;">
                    Reset your password
                  </h1>
                  <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 32px 0;">
                    Hi ${name}, we received a request to reset your 100Gigs password.
                    Click the button below to choose a new one.
                  </p>

                  <!-- CTA Button -->
                  <a href="${resetUrl}"
                    style="display:block;text-align:center;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:16px 32px;border-radius:14px;margin-bottom:24px;">
                    Reset Password →
                  </a>

                  <!-- Expiry notice -->
                  <p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin:0 0 24px 0;">
                    This link expires in <strong style="color:rgba(255,255,255,0.5);">1 hour</strong>.
                    If you didn't request this, you can safely ignore this email.
                  </p>

                  <!-- Divider -->
                  <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;">
                    <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
                      Or copy and paste this link into your browser:<br/>
                      <span style="color:rgba(74,222,128,0.6);word-break:break-all;">${resetUrl}</span>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding-top:24px;text-align:center;">
                  <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:0;">
                    © ${new Date().getFullYear()} 100Gigs · Port Harcourt, Nigeria
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    name,
    subject: 'Reset your 100Gigs password',
    html,
  });
}