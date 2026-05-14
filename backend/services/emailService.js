// Email delivery service.
//
// Two modes:
//   1. Production (or anytime RESEND_API_KEY is set): send via Resend's HTTP
//      API. We use fetch directly so we don't add another dependency for a
//      single request.
//   2. Dev / no API key: log the email body to the console and (where the
//      caller exposes it) return the URL so the signup page can show a
//      clickable dev link.
//
// To switch providers (Postmark, SendGrid, SES, etc), only this file needs
// to change — auth.js just calls sendVerificationEmail().

const RESEND_API = 'https://api.resend.com/emails';

function isLive() {
  return !!process.env.RESEND_API_KEY;
}

function fromAddress() {
  // Sensible default for dev; in prod you must set EMAIL_FROM to a
  // verified domain in your Resend dashboard.
  return process.env.EMAIL_FROM || 'hone <no-reply@hone.local>';
}

async function sendViaResend({ to, subject, html, text }) {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/**
 * Send the email-verification message.
 * Returns the verify URL (useful in dev so the API can echo it back to the
 * signup page for one-click testing). In prod, do NOT echo it to the client.
 */
async function sendVerificationEmail({ to, name, verifyUrl }) {
  const subject = 'Verify your hone account';
  const safeName = (name || 'there').toString().split(' ')[0];
  const text = [
    `Hi ${safeName},`,
    '',
    'Welcome to hone — a UC Davis–first student housing platform.',
    '',
    `Click the link below to verify your email. The link expires in 24 hours.`,
    verifyUrl,
    '',
    `If you didn't sign up, you can ignore this email.`,
    '',
    '— the hone team',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1F1F1F;">
      <div style="font-size:28px;letter-spacing:0.04em;font-weight:700;">hone</div>
      <p style="font-size:15px;line-height:1.5;margin-top:24px;">Hi ${escapeHtml(safeName)},</p>
      <p style="font-size:15px;line-height:1.5;">
        Welcome to <strong>hone</strong> — a UC Davis–first student housing platform.
      </p>
      <p style="font-size:15px;line-height:1.5;">
        Click the button below to verify your email. The link expires in 24 hours.
      </p>
      <p style="margin:28px 0;">
        <a href="${escapeAttr(verifyUrl)}"
           style="display:inline-block;background:#A9C089;color:#1F1F1F;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:600;">
          Verify my email
        </a>
      </p>
      <p style="font-size:13px;color:#666;line-height:1.5;">
        If the button doesn’t work, paste this URL into your browser:<br/>
        <a href="${escapeAttr(verifyUrl)}" style="color:#5F6C40;word-break:break-all;">${escapeHtml(verifyUrl)}</a>
      </p>
      <p style="font-size:13px;color:#666;line-height:1.5;margin-top:32px;">
        If you didn’t sign up for hone, you can safely ignore this email.
      </p>
    </div>
  `;

  if (isLive()) {
    try {
      await sendViaResend({ to, subject, html, text });
      console.log(`[email] sent verification to ${to} via Resend`);
    } catch (err) {
      // Never crash the request on email failure — log and surface a generic
      // problem to the user. The caller can decide whether to roll back.
      console.error('[email] Resend send failed:', err.message);
      throw err;
    }
  } else {
    console.log(
      `\n[email:dev] Verification link for ${to}:\n  ${verifyUrl}\n  (set RESEND_API_KEY to send a real email)\n`
    );
  }
  return verifyUrl;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) {
  return escapeHtml(s);
}

module.exports = {
  sendVerificationEmail,
  isLive,
};
