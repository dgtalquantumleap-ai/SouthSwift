// ── AGENT CONTROLLER ─────────────────────────────────────────────────────────
const { pool } = require('../config/db');

const agentController = {

  // GET /api/agents — all verified agents
  getAgents: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.full_name, u.phone, u.city, u.state, u.avatar_url,
               ap.agency_name, ap.verification_status, ap.total_deals,
               ap.rating, ap.bio, ap.verified_at
        FROM users u
        JOIN agent_profiles ap ON ap.user_id = u.id
        WHERE ap.verification_status = 'verified'
        ORDER BY ap.total_deals DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // GET /api/agents/:id
  getAgent: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.full_name, u.phone, u.city, u.state, u.avatar_url,
               ap.agency_name, ap.verification_status, ap.total_deals,
               ap.rating, ap.bio, ap.verified_at
        FROM users u
        JOIN agent_profiles ap ON ap.user_id = u.id
        WHERE u.id = $1
      `, [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Agent not found.' });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // POST /api/agents/verify-request — agent submits verification docs
  submitVerification: async (req, res) => {
    const { nin, agency_name, bio } = req.body;
    if (!nin) return res.status(400).json({ error: 'NIN is required for verification.' });

    const id_document_url = req.files?.id_document?.[0]?.path || null;
    const selfie_url      = req.files?.selfie?.[0]?.path || null;

    try {
      await pool.query(`
        UPDATE agent_profiles
        SET nin=$1, agency_name=$2, bio=$3, id_document_url=$4, selfie_url=$5,
            verification_status='pending', updated_at=NOW()
        WHERE user_id=$6
      `, [nin, agency_name||null, bio||null, id_document_url, selfie_url, req.user.id]);
      res.json({ message: 'Verification request submitted. SouthSwift will review within 48 hours.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // GET /api/agents/my/listings
  getAgentListings: async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM listings WHERE agent_id=$1 ORDER BY created_at DESC', [req.user.id]
      );
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
};

// ── ADMIN CONTROLLER ─────────────────────────────────────────────────────────
const adminController = {

  // GET /api/admin/dashboard
  getDashboard: async (req, res) => {
    try {
      const [users, listings, deals, agents, revenue] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM users'),
        pool.query('SELECT COUNT(*) FROM listings'),
        pool.query("SELECT COUNT(*) FROM deals WHERE status='completed'"),
        pool.query("SELECT COUNT(*) FROM agent_profiles WHERE verification_status='verified'"),
        pool.query("SELECT COALESCE(SUM(service_fee_tenant + service_fee_landlord),0) AS total FROM deals WHERE status='completed'"),
      ]);
      res.json({
        total_users:       parseInt(users.rows[0].count),
        total_listings:    parseInt(listings.rows[0].count),
        completed_deals:   parseInt(deals.rows[0].count),
        verified_agents:   parseInt(agents.rows[0].count),
        total_revenue_ngn: parseInt(revenue.rows[0].total),
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // GET /api/admin/agents/pending
  getPendingAgents: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.full_name, u.email, u.phone, u.state, u.city, u.created_at,
               ap.nin, ap.agency_name, ap.bio, ap.id_document_url, ap.selfie_url, ap.id AS profile_id
        FROM users u
        JOIN agent_profiles ap ON ap.user_id = u.id
        WHERE ap.verification_status = 'pending'
        ORDER BY u.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // PUT /api/admin/agents/:userId/verify
  verifyAgent: async (req, res) => {
    const { action } = req.body; // 'verify' or 'reject'
    if (!['verify','reject'].includes(action))
      return res.status(400).json({ error: 'Action must be verify or reject.' });
    try {
      const status = action === 'verify' ? 'verified' : 'rejected';
      await pool.query(`
        UPDATE agent_profiles
        SET verification_status=$1, verified_at=$2, verified_by=$3
        WHERE user_id=$4
      `, [status, action==='verify'?new Date():null, req.user.id, req.params.userId]);

      if (action === 'verify') {
        await pool.query("UPDATE users SET is_verified=true WHERE id=$1", [req.params.userId]);
      }
      res.json({ message: `Agent ${action}d successfully.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // GET /api/admin/deals
  getAllDeals: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT d.*, l.title AS listing_title, l.city,
               t.full_name AS tenant_name, t.phone AS tenant_phone,
               a.full_name AS agent_name
        FROM deals d
        JOIN listings l ON l.id=d.listing_id
        JOIN users t ON t.id=d.tenant_id
        JOIN users a ON a.id=d.agent_id
        ORDER BY d.created_at DESC LIMIT 100
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // PUT /api/admin/deals/:id/release-funds
  releaseFunds: async (req, res) => {
    try {
      await pool.query(
        "UPDATE deals SET status='completed', funds_released_at=NOW() WHERE id=$1",
        [req.params.id]
      );
      res.json({ message: 'Funds marked as released.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // PUT /api/admin/deals/:id/resolve-dispute
  resolveDispute: async (req, res) => {
    const { resolution, winner } = req.body;
    if (!resolution || !winner)
      return res.status(400).json({ error: 'resolution text and winner required.' });
    if (!['tenant','agent','split'].includes(winner))
      return res.status(400).json({ error: 'winner must be tenant, agent, or split.' });

    try {
      const dealResult = await pool.query('SELECT * FROM deals WHERE id=$1', [req.params.id]);
      if (!dealResult.rows.length) return res.status(404).json({ error: 'Deal not found.' });
      const deal = dealResult.rows[0];
      if (deal.status !== 'disputed')
        return res.status(400).json({ error: 'Deal is not disputed.' });

      await pool.query(
        "UPDATE deals SET status='completed', notes=$1, funds_released_at=NOW(), updated_at=NOW() WHERE id=$2",
        [`DISPUTE RESOLVED: ${resolution} | Winner: ${winner}`, req.params.id]
      );

      const { sendEmail } = require('./emailController');
      const tenantRes = await pool.query('SELECT email, full_name FROM users WHERE id=$1', [deal.tenant_id]);
      const agentRes  = await pool.query('SELECT email, full_name FROM users WHERE id=$1', [deal.agent_id]);
      const tenant = tenantRes.rows[0]; const agent = agentRes.rows[0];

      await sendEmail({
        to: tenant.email,
        subject: '🛡️ SouthSwift — Dispute Resolved',
        html: `<p>Dear ${tenant.full_name}, your dispute for deal ${deal.id.slice(0,8)} has been resolved.</p><p><strong>Resolution:</strong> ${resolution}</p>`,
      });
      await sendEmail({
        to: agent.email,
        subject: '🛡️ SouthSwift — Dispute Resolved',
        html: `<p>Dear ${agent.full_name}, the dispute for deal ${deal.id.slice(0,8)} has been resolved.</p><p><strong>Resolution:</strong> ${resolution}</p>`,
      });

      res.json({ message: 'Dispute resolved and parties notified.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // GET /api/admin/users
  getUsers: async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, full_name, email, phone, role, is_verified, state, city, created_at FROM users ORDER BY created_at DESC'
      );
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // GET /api/admin/listings
  getAllListings: async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT l.*, u.full_name AS agent_name, ap.verification_status
        FROM listings l
        JOIN users u ON u.id=l.agent_id
        LEFT JOIN agent_profiles ap ON ap.user_id=l.agent_id
        ORDER BY l.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },
};

module.exports = { agentController, adminController };
