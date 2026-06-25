/**
 * lib/brevo.js
 * Send transactional emails via Brevo (formerly Sendinblue).
 * Uses the REST API directly — no SDK needed.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

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
        email: 'izzythedev@gmail.com',
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

export async function sendPasswordResetEmail(to, name, resetUrl) {
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your 100Gigs password</title>
</head>
<body style="margin:0;padding:0;background:#080f0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#080f0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:500px;">

          <!-- ── Logo ── -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <!-- Green icon circle -->
                  <td style="padding-right:12px;vertical-align:middle;">
                    <div style="width:48px;height:48px;background:linear-gradient(135deg,#16a34a,#15803d);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(22,163,74,0.35);">
                      <span style="color:#ffffff;font-size:22px;font-weight:900;line-height:1;">G</span>
                    </div>
                  </td>
                  <!-- Wordmark -->
                  <td style="vertical-align:middle;">
                    <span style="font-size:28px;font-weight:900;letter-spacing:-1px;line-height:1;">
                      <span style="color:#4ade80;">100</span><span style="color:#ffffff;">Gigs</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Card ── -->
          <tr>
            <td style="background:#0d1a0d;border:1px solid rgba(255,255,255,0.09);border-radius:24px;overflow:hidden;">

              <!-- Green top accent bar -->
              <div style="height:4px;background:linear-gradient(90deg,#16a34a,#4ade80,#15803d);"></div>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 36px;">

                <!-- Lock icon -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <div style="width:60px;height:60px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;">
                      <span style="font-size:28px;line-height:1;">🔐</span>
                    </div>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-bottom:12px;">
                    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">
                      Reset your password
                    </h1>
                  </td>
                </tr>

                <!-- Body text -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <p style="margin:0;color:rgba(255,255,255,0.45);font-size:15px;line-height:1.7;">
                      Hi <strong style="color:rgba(255,255,255,0.75);">${name}</strong>, we received a request
                      to reset your 100Gigs password. Click the button below to choose a new one.
                    </p>
                  </td>
                </tr>

                <!-- CTA button -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <a href="${resetUrl}"
                      style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:14px;letter-spacing:0.2px;box-shadow:0 6px 20px rgba(22,163,74,0.4);">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>

                <!-- Expiry pill -->
                <tr>
                  <td style="padding-bottom:32px;">
                    <div style="display:inline-block;background:rgba(250,204,21,0.08);border:1px solid rgba(250,204,21,0.2);border-radius:50px;padding:8px 16px;">
                      <span style="color:#facc15;font-size:12px;font-weight:600;">
                        ⏱ This link expires in 1 hour
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="border-top:1px solid rgba(255,255,255,0.07);padding-top:24px;padding-bottom:8px;">
                    <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;line-height:1.6;">
                      If you didn't request this, you can safely ignore this email — your password won't change.
                    </p>
                  </td>
                </tr>

                <!-- Fallback link -->
                <tr>
                  <td style="padding-top:16px;">
                    <p style="margin:0;color:rgba(255,255,255,0.15);font-size:11px;line-height:1.6;">
                      Or copy and paste this URL into your browser:
                    </p>
                    <p style="margin:6px 0 0 0;word-break:break-all;font-size:11px;">
                      <a href="${resetUrl}" style="color:rgba(74,222,128,0.5);text-decoration:none;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px 0;color:rgba(255,255,255,0.15);font-size:12px;">
                © ${year} 100Gigs &middot; Port Harcourt, Nigeria
              </p>
              <p style="margin:0;color:rgba(255,255,255,0.1);font-size:11px;">
                The local gig marketplace for Port Harcourt
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