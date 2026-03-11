const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  // Email to Viraj — lead notification
  const notifyHTML = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:32px 0;margin:0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0A1628;padding:24px 32px;">
          <span style="font-family:'Times New Roman',serif;font-size:20px;color:#C8973E;font-style:italic;font-weight:bold;">Beanz</span>
          <span style="font-size:20px;color:#fff;font-weight:bold;"> Consulting.</span>
          <span style="float:right;background:#C8973E;color:#0A1628;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:4px;margin-top:4px;">GUIDE DOWNLOAD</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#0A1628;font-weight:bold;">New guide request</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6B7589;">Someone requested the <strong>7 Signs Your GBS Vendor May Be Overcharging You</strong> guide.</p>
          <div style="margin-top:20px;background:#f8f9fb;border-left:3px solid #C8973E;padding:14px 20px;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:13px;color:#6B7589;font-weight:bold;">EMAIL</p>
            <p style="margin:4px 0 0;font-size:15px;color:#0A1628;"><a href="mailto:${email}" style="color:#C8973E;">${email}</a></p>
          </div>
        </td></tr>
        <tr><td style="background:#f0f2f5;padding:16px 32px;border-top:1px solid #e2e5eb;">
          <p style="margin:0;font-size:12px;color:#9AA2B1;">Submitted via <a href="https://www.beanz.in" style="color:#C8973E;">www.beanz.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Confirmation email to the requester
  const confirmHTML = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:32px 0;margin:0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0A1628;padding:28px 36px;">
          <span style="font-family:'Times New Roman',serif;font-size:22px;color:#C8973E;font-style:italic;font-weight:bold;">Beanz</span>
          <span style="font-size:22px;color:#ffffff;font-weight:bold;"> Consulting.</span>
        </td></tr>
        <tr><td style="padding:36px;">
          <p style="margin:0 0 16px;font-size:16px;color:#0A1628;font-weight:bold;">Your guide is on its way.</p>
          <p style="margin:0 0 16px;font-size:14px;color:#6B7589;line-height:1.7;">Thanks for requesting <strong>7 Signs Your GBS Vendor May Be Overcharging You</strong>. We'll send it to you shortly — usually within a few hours.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6B7589;line-height:1.7;">In the meantime, if you have an active GBS engagement and want to talk about what an independent audit could uncover, feel free to reply to this email.</p>
          <a href="https://www.beanz.in/#contact" style="display:inline-block;background:#C8973E;color:#ffffff;font-size:13px;font-weight:bold;padding:12px 24px;border-radius:4px;text-decoration:none;letter-spacing:.5px;">Book a Scoping Call →</a>
        </td></tr>
        <tr><td style="background:#f0f2f5;padding:20px 36px;border-top:1px solid #e2e5eb;">
          <p style="margin:0;font-size:12px;color:#9AA2B1;">© Beanz Consulting · <a href="https://www.beanz.in" style="color:#C8973E;text-decoration:none;">www.beanz.in</a> · <a href="mailto:connect@beanz.in" style="color:#C8973E;text-decoration:none;">connect@beanz.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    // Send lead notification to Viraj
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Beanz Website <noreply@beanz.in>',
        to: 'connect@beanz.in',
        reply_to: email,
        subject: `Guide Request — ${email}`,
        html: notifyHTML
      })
    });

    // Load PDF guide and send confirmation to requester
    const pdfPath = path.join(process.cwd(), 'public', 'beanz-accord-7-signs.pdf');
    const attachments = [];
    if (fs.existsSync(pdfPath)) {
      const pdfData = fs.readFileSync(pdfPath).toString('base64');
      attachments.push({
        filename: 'Beanz-ACCORD-7-Signs-GBS-Vendor-Overcharging.pdf',
        content: pdfData
      });
    }

    const confirmPayload = {
      from: 'Viraj Mehta — Beanz Consulting <connect@beanz.in>',
      to: email,
      subject: 'Your guide: 7 Signs Your GBS Vendor May Be Overcharging You',
      html: confirmHTML
    };
    if (attachments.length) confirmPayload.attachments = attachments;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(confirmPayload)
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Guide send error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
