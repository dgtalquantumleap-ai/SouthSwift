const { pool } = require('../config/db');
const { sendEmail } = require('./emailController');

// POST /api/waitlist
const joinWaitlist = async (req, res) => {
  const { email, phone, role, city, state } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email and role are required.' });

  try {
    const existing = await pool.query('SELECT id FROM waitlist WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'This email is already on the waitlist.' });
    }

    await pool.query(
      'INSERT INTO waitlist (email, phone, role, city, state) VALUES ($1,$2,$3,$4,$5)',
      [email, phone || null, role, city || null, state || null]
    );

    await sendEmail({
      to: email,
      subject: "🛡️ You're on the SouthSwift waitlist!",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
          <div style="text-align:center;margin-bottom:28px;">
            <h1 style="color:#1B4332;font-family:Georgia,serif;margin:0;">South<span style="color:#C8963C;">Swift</span></h1>
            <p style="color:#888;font-size:13px;margin:4px 0 0;">Nigeria's Verified Property Platform</p>
          </div>
          <h2 style="color:#1B4332;font-size:20px;">You're on the list. 🎉</h2>
          <p style="color:#444;font-size:15px;line-height:1.7;">
            We're putting the final touches on SouthSwift — the platform that protects every Nigerian
            rental with escrow payments, verified agents, and auto-generated legal agreements.
          </p>
          <p style="color:#444;font-size:15px;line-height:1.7;">
            As a <strong>${role}</strong>${city ? ` in <strong>${city}</strong>` : ''},
            you'll be among the first to access the platform when we launch.
          </p>
          <div style="background:#F0F9F0;border-radius:12px;padding:18px 20px;margin:24px 0;">
            <p style="color:#1B4332;font-weight:700;margin:0 0 8px;font-size:14px;">What to expect on launch:</p>
            <p style="color:#555;font-size:13px;margin:4px 0;">🛡️ SwiftShield — Escrow protection on every deal</p>
            <p style="color:#555;font-size:13px;margin:4px 0;">📋 SwiftDoc — Instant legal tenancy agreements</p>
            <p style="color:#555;font-size:13px;margin:4px 0;">✅ Verified agents — Identity checked, fraud prevented</p>
            <p style="color:#555;font-size:13px;margin:4px 0;">👥 Room sharing — Co-rent with full escrow protection</p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:28px;">
            Questions? Reply to this email or reach us at ceo@southswift.com.ng<br/>
            <strong>Oladeji Ayeni Joshua</strong> — CEO, SouthSwift Enterprise
          </p>
        </div>
      `,
    });

    await sendEmail({
      to: 'ceo@southswift.com.ng',
      subject: `🔔 New Waitlist Signup — ${role} in ${city || 'Unknown'}`,
      html: `<p>New waitlist signup:</p><ul><li>Email: ${email}</li><li>Phone: ${phone || 'N/A'}</li><li>Role: ${role}</li><li>City: ${city || 'N/A'}</li><li>State: ${state || 'N/A'}</li></ul>`,
    });

    res.status(201).json({ message: "You're on the waitlist! Check your email for confirmation." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/waitlist — admin only
const getWaitlist = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM waitlist ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { joinWaitlist, getWaitlist };
