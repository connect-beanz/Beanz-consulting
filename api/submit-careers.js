const crypto = require('crypto');

function verifyToken(email, otp, token) {
  try {
    const { payload, hmac } = JSON.parse(Buffer.from(token, 'base64').toString());
    const [tokenEmail, tokenOTP, expiry] = payload.split('|');

    if (Date.now() > parseInt(expiry)) return { valid: false, reason: 'OTP has expired. Please request a new one.' };
    if (tokenEmail !== email.toLowerCase()) return { valid: false, reason: 'Email mismatch.' };
    if (tokenOTP !== otp.trim()) return { valid: false, reason: 'Incorrect OTP. Please try again.' };

    const expected = crypto
      .createHmac('sha256', process.env.OTP_SECRET)
      .update(payload)
      .digest('hex');
    if (hmac !== expected) return { valid: false, reason: 'Invalid token.' };

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid token. Please refresh and try again.' };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, interest, experience, linkedin, pitch, resume, resumeName, otp, token } = req.body;

  // Verify OTP
  const check = verifyToken(email, otp, token);
  if (!check.valid) return res.status(400).json({ error: check.reason });

  // Validate required fields
  if (!name || !email || !interest || !experience || !pitch) {
    return res.status(400).json({ error: 'All required fields must be filled.' });
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#0A1628;padding:0;margin:0;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0A1628;padding:24px 32px;">
          <span style="font-family:'Times New Roman',serif;font-size:20px;color:#C8973E;font-style:italic;font-weight:bold;">Beanz</span>
          <span style="font-size:20px;color:#fff;font-weight:bold;"> Consulting.</span>
          <span style="float:right;background:#2A6049;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;margin-top:4px;">NEW APPLICATION</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#f8f9fb;"><td style="width:35%;font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">NAME</td><td style="font-size:14px;color:#0A1628;padding:10px 12px;border-bottom:1px solid #e2e5eb;">${name}</td></tr>
            <tr><td style="font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">EMAIL</td><td style="font-size:14px;padding:10px 12px;border-bottom:1px solid #e2e5eb;"><a href="mailto:${email}" style="color:#C8973E;">${email}</a></td></tr>
            <tr style="background:#f8f9fb;"><td style="font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">APPLYING FOR</td><td style="font-size:14px;color:#0A1628;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">${interest}</td></tr>
            <tr><td style="font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">EXPERIENCE</td><td style="font-size:14px;padding:10px 12px;border-bottom:1px solid #e2e5eb;">${experience}</td></tr>
            ${linkedin ? `<tr style="background:#f8f9fb;"><td style="font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">LINKEDIN</td><td style="font-size:14px;padding:10px 12px;border-bottom:1px solid #e2e5eb;"><a href="${linkedin}" style="color:#C8973E;">${linkedin}</a></td></tr>` : ''}
          </table>
          <div style="margin-top:20px;background:#f8f9fb;border-left:3px solid #C8973E;padding:16px 20px;border-radius:0 6px 6px 0;">
            <p style="margin:0 0 6px;font-size:12px;color:#6B7589;font-weight:bold;">PITCH</p>
            <p style="margin:0;font-size:14px;color:#0A1628;line-height:1.6;">${pitch.replace(/\n/g, '<br>')}</p>
          </div>
          ${resume ? `<p style="margin:16px 0 0;font-size:13px;color:#6B7589;">📎 CV attached: <strong>${resumeName || 'resume'}</strong></p>` : '<p style="margin:16px 0 0;font-size:13px;color:#9AA2B1;">No CV attached.</p>'}
        </td></tr>
        <tr><td style="background:#f0f2f5;padding:16px 32px;border-top:1px solid #e2e5eb;">
          <p style="margin:0;font-size:12px;color:#9AA2B1;">Submitted via <a href="https://www.beanz.in" style="color:#C8973E;">www.beanz.in</a> · Email verified ✓</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Build attachments array if resume provided
  const attachments = [];
  if (resume && resumeName) {
    attachments.push({
      filename: resumeName,
      content: resume // base64 string
    });
  }

  try {
    const payload = {
      from: 'Beanz Website <noreply@beanz.in>',
      to: 'connect@beanz.in',
      reply_to: email,
      subject: `New Application — ${name} · ${interest}`,
      html
    };
    if (attachments.length) payload.attachments = attachments;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send application. Please email us directly.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

