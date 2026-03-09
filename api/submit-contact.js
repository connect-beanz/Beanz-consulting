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

  const { name, email, company, service, message, otp, token } = req.body;

  // Verify OTP
  const check = verifyToken(email, otp, token);
  if (!check.valid) return res.status(400).json({ error: check.reason });

  // Validate fields
  if (!name || !email || !company || !service || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
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
          <span style="float:right;background:#C8973E;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;margin-top:4px;">NEW ENQUIRY</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#f8f9fb;"><td style="width:35%;font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">NAME</td><td style="font-size:14px;color:#0A1628;padding:10px 12px;border-bottom:1px solid #e2e5eb;">${name}</td></tr>
            <tr><td style="font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">EMAIL</td><td style="font-size:14px;padding:10px 12px;border-bottom:1px solid #e2e5eb;"><a href="mailto:${email}" style="color:#C8973E;">${email}</a></td></tr>
            <tr style="background:#f8f9fb;"><td style="font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">COMPANY</td><td style="font-size:14px;color:#0A1628;padding:10px 12px;border-bottom:1px solid #e2e5eb;">${company}</td></tr>
            <tr><td style="font-size:12px;color:#6B7589;font-weight:bold;padding:10px 12px;border-bottom:1px solid #e2e5eb;">SERVICE</td><td style="font-size:14px;padding:10px 12px;border-bottom:1px solid #e2e5eb;"><strong>${service}</strong></td></tr>
          </table>
          <div style="margin-top:20px;background:#f8f9fb;border-left:3px solid #C8973E;padding:16px 20px;border-radius:0 6px 6px 0;">
            <p style="margin:0 0 6px;font-size:12px;color:#6B7589;font-weight:bold;">MESSAGE</p>
            <p style="margin:0;font-size:14px;color:#0A1628;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p>
          </div>
        </td></tr>
        <tr><td style="background:#f0f2f5;padding:16px 32px;border-top:1px solid #e2e5eb;">
          <p style="margin:0;font-size:12px;color:#9AA2B1;">Submitted via <a href="https://www.beanz.in" style="color:#C8973E;">www.beanz.in</a> · Email verified ✓</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Beanz Website <noreply@beanz.in>',
        to: 'connect@beanz.in',
        reply_to: email,
        subject: `New Enquiry — ${name} (${company}) · ${service}`,
        html
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send message. Please email us directly.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

