const crypto = require('crypto');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createToken(email, otp) {
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  const payload = `${email.toLowerCase()}|${otp}|${expiry}`;
  const hmac = crypto
    .createHmac('sha256', process.env.OTP_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64');
}

function emailHTML(otp, formType) {
  const context = formType === 'careers'
    ? 'your career application to Beanz Consulting'
    : 'your enquiry to Beanz Consulting';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#0A1628;padding:28px 36px;">
            <span style="font-family:'Times New Roman',serif;font-size:22px;color:#C8973E;font-style:italic;font-weight:bold;">Beanz</span>
            <span style="font-size:22px;color:#ffffff;font-weight:bold;"> Consulting.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px;">
            <p style="margin:0 0 8px;font-size:14px;color:#6B7589;">Your verification code for</p>
            <p style="margin:0 0 28px;font-size:14px;color:#0A1628;font-weight:bold;">${context}</p>
            <div style="background:#0A1628;border-radius:8px;padding:28px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 8px;font-size:12px;color:#9AA2B1;letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
              <p style="margin:0;font-size:40px;font-weight:bold;letter-spacing:10px;color:#C8973E;">${otp}</p>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#6B7589;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="margin:0;font-size:13px;color:#6B7589;">If you did not request this, please ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0f2f5;padding:20px 36px;border-top:1px solid #e2e5eb;">
            <p style="margin:0;font-size:12px;color:#9AA2B1;">© Beanz Consulting · <a href="https://www.beanz.in" style="color:#C8973E;text-decoration:none;">www.beanz.in</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, formType } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const otp = generateOTP();
  const token = createToken(email, otp);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Beanz Consulting <noreply@beanz.in>',
        to: email,
        subject: `${otp} — Your Beanz Consulting verification code`,
        html: emailHTML(otp, formType)
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true, token });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

