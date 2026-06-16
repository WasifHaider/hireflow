export interface VerificationEmailParams {
  name: string;
  verificationLink: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

const INDIGO = '#4F46E5';

// Escape user-controlled values (name) before interpolating into HTML to avoid
// breaking the markup or injecting content.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderVerificationEmail({
  name,
  verificationLink,
}: VerificationEmailParams): RenderedEmail {
  const safeName = escapeHtml(name);

  const text = [
    `Hi ${name},`,
    '',
    'Welcome to HireFlow! Please verify your email address to activate your account.',
    '',
    'Verify your email by opening this link:',
    verificationLink,
    '',
    'This link expires in 24 hours. If you did not create a HireFlow account, you can safely ignore this email.',
    '',
    '— The HireFlow Team',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Verify your HireFlow account</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F7;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E2030;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F7;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.08);">
          <tr>
            <td style="background:${INDIGO};padding:24px 32px;color:#FFFFFF;font-size:20px;font-weight:700;">
              HireFlow
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;">Hi ${safeName},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3A3F51;">
                Welcome to HireFlow! Confirm your email address to activate your account and start tracking your applications.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="border-radius:8px;background:${INDIGO};">
                    <a href="${verificationLink}" target="_blank"
                       style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">
                      Verify my email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#5B6072;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
                <a href="${verificationLink}" target="_blank" style="color:${INDIGO};">${verificationLink}</a>
              </p>
              <p style="margin:0;font-size:13px;color:#5B6072;">
                This link expires in <strong>24 hours</strong>. If you did not create a HireFlow account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #ECECF1;font-size:12px;color:#9097A6;">
              — The HireFlow Team
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}
