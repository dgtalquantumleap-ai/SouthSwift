const crypto  = require('crypto');
const axios   = require('axios');
const { pool } = require('../config/db');
const { escapeHtml }    = require('../utils/escapeHtml');
const { runSwiftDocBackground } = require('./dealController');
const { handleEmail } = require('../utils/emailService');

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_EMAIL || 'ceo@southswift.com.ng';

// Curated list of Nigerian banks for the payer-bank dropdown. (The Paystack
// /bank proxy in agentAdminController requires a Paystack key, which isn't
// available pre-production — this keeps the field populated without that dependency.)
const NIGERIAN_BANKS = [
  'Access Bank', 'Ecobank Nigeria', 'Fidelity Bank', 'First Bank of Nigeria',
  'First City Monument Bank (FCMB)', 'Globus Bank', 'Guaranty Trust Bank (GTBank)',
  'Heritage Bank', 'Keystone Bank', 'Moniepoint Microfinance Bank', 'OPay',
  'PalmPay', 'Parallex Bank', 'Polaris Bank', 'Premium Trust Bank', 'Providus Bank',
  'Stanbic IBTC Bank', 'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank',
  'Union Bank of Nigeria', 'United Bank for Africa (UBA)', 'Unity Bank',
  'Wema Bank', 'Zenith Bank', 'Kuda Microfinance Bank', 'Citibank Nigeria',
  'Titan Trust Bank',
];

// In-process cache of the bank list (refreshed at most every 3 days) so we don't
// hit Paystack on every page load.
const BANK_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
let bankCache = { at: 0, banks: null };

// GET /api/payments/banks — list of Nigerian banks for the payer-bank dropdown.
// Prefers the live Paystack /bank list when a key is configured; otherwise falls
// back to the curated static list so the field is never empty pre-production.
const getNigerianBanks = async (req, res) => {
  if (bankCache.banks && Date.now() - bankCache.at < BANK_CACHE_TTL_MS) {
    return res.json({ banks: bankCache.banks });
  }
  let banks = NIGERIAN_BANKS;
  if (process.env.PAYSTACK_SECRET_KEY) {
    try {
      const r = await axios.get('https://api.paystack.co/bank?country=nigeria&currency=NGN', {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        timeout: 10000,
      });
      const live = (r.data?.data || [])
        .filter(b => b.country === 'Nigeria' && b.active !== false)
        .map(b => b.name)
        .sort((a, b) => a.localeCompare(b));
      if (live.length) banks = live;
    } catch (e) {
      console.warn('Paystack bank list fetch failed, using static fallback:', e.message);
    }
  }
  bankCache = { at: Date.now(), banks };
  res.json({ banks });
};

// Server-generated, human-readable unique transaction reference. The UNIQUE
// constraint on payment_transactions.reference is the source of truth; this
// generator just makes collisions (and the retry loop) practically impossible.
const generateTxnReference = () =>
  `SS-TRX-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

// GET /api/payments/account — SouthSwift's receiving account for manual transfers.
const getCompanyAccount = async (req, res) => {
  const account_name   = process.env.SS_ACCOUNT_NAME;
  const account_number = process.env.SS_ACCOUNT_NUMBER;
  const bank_name      = process.env.SS_BANK_NAME;
  if (!account_name || !account_number || !bank_name)
    return res.status(503).json({ error: 'Company bank account is not configured. Please contact support.' });
  res.json({ account_name, account_number, bank_name });
};

// POST /api/payments/submit — tenant submits transfer proof for admin review.
const submitTransfer = async (req, res) => {
  const { deal_id, amount_naira, payer_bank, transfer_reference, transfer_date } = req.body;
  if (!deal_id) return res.status(400).json({ error: 'Deal ID required.' });
  if (!transfer_reference || !transfer_reference.trim())
    return res.status(400).json({ error: 'Transfer reference is required.' });
  if (!payer_bank || !payer_bank.trim())
    return res.status(400).json({ error: 'The bank you transferred from is required.' });
  if (!transfer_date)
    return res.status(400).json({ error: 'Transfer date is required.' });
  if (!req.file)
    return res.status(400).json({ error: 'A receipt screenshot or PDF is required.' });
  const amount = Math.round(Number(amount_naira));
  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'A valid amount sent is required.' });

  const receipt_url = req.file?.path || null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dealRes = await client.query('SELECT * FROM deals WHERE id=$1 FOR UPDATE', [deal_id]);
    if (!dealRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Deal not found.' }); }
    const deal = dealRes.rows[0];
    if (deal.tenant_id !== req.user.id) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Not authorised for this deal.' }); }
    if (!['initiated', 'payment_pending'].includes(deal.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot submit proof for a deal in status: ${deal.status}` });
    }

    // Idempotent: a pending_review txn already exists → return it, don't duplicate.
    const existing = await client.query(
      "SELECT * FROM payment_transactions WHERE deal_id=$1 AND status='pending_review' ORDER BY created_at DESC LIMIT 1",
      [deal_id]
    );
    if (existing.rows.length) {
      await client.query('COMMIT');
      return res.json({ message: 'A pending proof already exists for this deal.', transaction: existing.rows[0] });
    }

    // Generate a unique reference, retrying (rare) collisions. If the partial-unique
    // index still rejects us (a concurrent submit won the race), return the existing one.
    let inserted = null;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      const reference = generateTxnReference();
      try {
        const r = await client.query(
          `INSERT INTO payment_transactions
            (deal_id, reference, tenant_id, amount_expected_naira, amount_naira,
             payer_bank, transfer_reference, transfer_date, receipt_url, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_review') RETURNING *`,
          [deal_id, reference, req.user.id, Number(deal.total_paid), amount,
           payer_bank?.trim() || null, transfer_reference.trim(),
           transfer_date ? new Date(transfer_date) : null, receipt_url]
        );
        inserted = r.rows[0];
      } catch (insErr) {
        const msg = insErr.message || '';
        const isDup = /duplicate|uniq_pending_txn_per_deal/i.test(msg);
        if (!isDup) throw insErr;
        const ex = await client.query(
          "SELECT * FROM payment_transactions WHERE deal_id=$1 AND status='pending_review' LIMIT 1", [deal_id]);
        if (ex.rows[0]) { inserted = ex.rows[0]; break; }
      }
    }
    if (!inserted) { await client.query('ROLLBACK'); return res.status(500).json({ error: 'Could not create transaction reference. Please try again.' }); }

    await client.query(
      "INSERT INTO transaction_audit (transaction_id, actor_id, actor_role, action, note) VALUES ($1,$2,$3,'created',$4)",
      [inserted.id, req.user.id, req.user.role, `Submitted transfer proof: ${transfer_reference.trim()}`]
    );

    await client.query('COMMIT');

    // Notify tenant + admin (best-effort, non-blocking).
    (async () => {
      try {
        const tenantRes = await pool.query('SELECT full_name, email FROM users WHERE id=$1', [req.user.id]);
        const tenant = tenantRes.rows[0];
        if (tenant?.email) {
          await handleEmail({
            to: tenant.email,
            subject: '🛡️ SouthSwift — Transfer Proof Received',
            html: `<h2>We received your transfer proof</h2>
              <p>Dear ${escapeHtml(tenant.full_name)},</p>
              <p>Thank you. We've received your transfer proof for Deal <strong>${deal_id.slice(0, 8)}</strong> and it's now awaiting admin confirmation.</p>
              <p><strong>Transaction Reference:</strong> ${inserted.reference}</p>
              <p><strong>Amount sent:</strong> ₦${amount.toLocaleString()}</p>
              <p>Your rent will be secured in SwiftShield escrow once an admin confirms the transfer. You'll get a receipt by email.</p>`,
          });
        }
        await handleEmail({
          to: ADMIN_NOTIFY_EMAIL,
          subject: '🛡️ ADMIN: New Transfer Awaiting Review',
          html: `<h2>New bank transfer awaiting review</h2>
            <p><strong>Deal ID:</strong> ${deal_id}</p>
            <p><strong>Tenant:</strong> ${escapeHtml(tenant?.full_name || '')} (${tenant?.email || ''})</p>
            <p><strong>Transaction Reference:</strong> ${inserted.reference}</p>
            <p><strong>Amount sent:</strong> ₦${amount.toLocaleString()} (expected ₦${Number(deal.total_paid).toLocaleString()})</p>
            <p><strong>Transfer Ref:</strong> ${escapeHtml(transfer_reference.trim())}</p>
            <p>Review and approve in the admin panel → Transactions.</p>`,
        });
      } catch (e) { console.error('submitTransfer notify error:', e.message); }
    })();

    res.json({ message: 'Transfer proof submitted. Awaiting admin confirmation.', transaction: inserted });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('submitTransfer error:', err.message);
    res.status(500).json({ error: 'Something went wrong submitting your proof.' });
  } finally {
    client.release();
  }
};

// GET /api/admin/transactions — queue + audit list (admin).
const listTransactions = async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    const where = status ? 'WHERE t.status=$1' : '';
    if (status) params.push(status);
    const result = await pool.query(`
      SELECT t.*, d.listing_id, d.total_paid, d.status AS deal_status,
             l.title AS listing_title, l.city, l.state,
             u.full_name AS tenant_name, u.email AS tenant_email
      FROM payment_transactions t
      JOIN deals d ON d.id = t.deal_id
      JOIN listings l ON l.id = d.listing_id
      JOIN users u ON u.id = t.tenant_id
      ${where}
      ORDER BY CASE WHEN t.status='pending_review' THEN 0 ELSE 1 END, t.created_at DESC
      LIMIT 200
    `, params);
    res.json(result.rows);
  } catch (err) { console.error(err.message); res.status(500).json({ error: 'Something went wrong.' }); }
};

// GET /api/admin/transactions/:id — detail + audit timeline (admin).
const getTransaction = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, d.listing_id, d.total_paid, d.status AS deal_status,
             l.title AS listing_title, l.city, l.state,
             u.full_name AS tenant_name, u.email AS tenant_email,
             a.full_name AS reviewer_name
      FROM payment_transactions t
      JOIN deals d ON d.id = t.deal_id
      JOIN listings l ON l.id = d.listing_id
      JOIN users u ON u.id = t.tenant_id
      LEFT JOIN users a ON a.id = t.reviewed_by
      WHERE t.id=$1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Transaction not found.' });
    const txn = result.rows[0];
    const audit = await pool.query(
      `SELECT ta.*, u.full_name AS actor_name
       FROM transaction_audit ta LEFT JOIN users u ON u.id = ta.actor_id
       WHERE ta.transaction_id=$1 ORDER BY ta.created_at ASC`, [req.params.id]);
    res.json({ transaction: txn, audit: audit.rows });
  } catch (err) { console.error(err.message); res.status(500).json({ error: 'Something went wrong.' }); }
};

// PUT /api/admin/transactions/:id — approve or reject (admin).
const reviewTransaction = async (req, res) => {
  const { action, note } = req.body;
  if (!['approve', 'reject'].includes(action))
    return res.status(400).json({ error: "action must be 'approve' or 'reject'." });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txnRes = await client.query('SELECT * FROM payment_transactions WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!txnRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Transaction not found.' }); }
    const txn = txnRes.rows[0];
    if (txn.status !== 'pending_review') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Transaction is already ${txn.status}.` });
    }

    const dealRes = await client.query('SELECT * FROM deals WHERE id=$1 FOR UPDATE', [txn.deal_id]);
    if (!dealRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Deal not found.' }); }
    const deal = dealRes.rows[0];

    if (action === 'reject') {
      const release = !!req.body.release_listing;
      await client.query(
        "UPDATE payment_transactions SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), review_note=$2, updated_at=NOW() WHERE id=$3",
        [req.user.id, note || null, txn.id]);
      await client.query(
        "INSERT INTO transaction_audit (transaction_id, actor_id, actor_role, action, note) VALUES ($1,$2,$3,'rejected',$4)",
        [txn.id, req.user.id, req.user.role, `${note || 'Rejected by admin'}${release ? ' — listing released' : ' — listing held'}`]);

      // "Reject & release unit" frees the reservation; "Reject proof (keep held)"
      // leaves it reserved so the tenant can resubmit. Guarded so a unit already
      // booked by another deal is never freed.
      if (release) {
        if (deal.is_room_share_deal) {
          await client.query(
            `UPDATE listings l
             SET room_share_slots_filled = GREATEST(l.room_share_slots_filled - 1, 0),
                 is_available = (l.room_share_slots_filled - 1 < l.room_share_slots)
             WHERE id=$1`, [deal.listing_id]);
        } else {
          await client.query(
            `UPDATE listings SET is_available=true WHERE id=$1
             AND NOT EXISTS (SELECT 1 FROM deals d
                             WHERE d.listing_id=$1 AND d.status IN ('escrow_held','docs_generated','movein_pending','completed','disputed'))`,
            [deal.listing_id]);
        }
      }

      await client.query('COMMIT');

      // Notify the tenant (best-effort, non-blocking).
      (async () => {
        try {
          const tenantRes = await pool.query('SELECT full_name, email FROM users WHERE id=$1', [deal.tenant_id]);
          const tenant = tenantRes.rows[0];
          if (tenant?.email) {
            await handleEmail({
              to: tenant.email,
              subject: '🛡️ SouthSwift — Transfer Proof Rejected',
              html: `<h2>Your transfer proof was rejected</h2>
                <p>Dear ${escapeHtml(tenant.full_name)},</p>
                <p>An admin reviewed the transfer proof for Deal <strong>${deal.id.slice(0, 8)}</strong> and rejected it${note ? ` with the note: “${escapeHtml(note)}”` : ''}.</p>
                ${release
                  ? '<p>The listing is now open to other tenants. If you have already made the bank transfer, please resubmit corrected proof promptly or contact SouthSwift support about a refund.</p>'
                  : '<p>Your reservation is still held. You can submit a corrected proof from your deal page.</p>'}
              `,
            });
          }
        } catch (e) { console.error('reject notify error:', e.message); }
      })();

      res.json({ message: release ? 'Transaction rejected and listing released.' : 'Transaction rejected. Listing reservation kept.' });
      return;
    }

    // ── APPROVE ──
    const listingRes = await client.query('SELECT * FROM listings WHERE id=$1 FOR UPDATE', [deal.listing_id]);
    const listing = listingRes.rows[0];

    // Double-booking guard: another deal already booked this apartment?
    if (!deal.is_room_share_deal) {
      const booked = await client.query(
        `SELECT 1 FROM deals
         WHERE listing_id=$1 AND id<>$2
           AND status IN ('escrow_held','docs_generated','movein_pending','completed','disputed')
         LIMIT 1`, [deal.listing_id, deal.id]);
      if (booked.rows.length) {
        await client.query(
          "UPDATE payment_transactions SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), review_note=$2, updated_at=NOW() WHERE id=$3",
          [req.user.id, 'Rejected: listing already booked by another tenant.', txn.id]);
        await client.query(
          "UPDATE deals SET status='cancelled', cancellation_reason=$1, cancelled_by=$2, updated_at=NOW() WHERE id=$3",
          ['Listing already booked by another tenant.', req.user.id, deal.id]);
        await client.query(
          "INSERT INTO transaction_audit (transaction_id, actor_id, actor_role, action, note) VALUES ($1,$2,$3,'rejected',$4)",
          [txn.id, req.user.id, req.user.role, 'Auto-rejected: listing already booked']);
        // Listing is already booked by another deal — guarded release is a safe no-op.
        await client.query(`UPDATE listings SET is_available=true WHERE id=$1
           AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.listing_id=$1 AND d.status IN ('escrow_held','docs_generated','movein_pending','completed','disputed'))`,
          [deal.listing_id]);
        await client.query('COMMIT');
        return res.status(409).json({ error: 'This listing was already booked by another tenant. The deal has been cancelled — please refund the tenant.' });
      }
    } else if (Number(listing.room_share_slots_filled) >= Number(listing.room_share_slots)) {
      // Room-share: ensure a slot is still free.
      await client.query(
        "UPDATE payment_transactions SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), review_note=$2, updated_at=NOW() WHERE id=$3",
        [req.user.id, 'Rejected: all room-share slots filled.', txn.id]);
      await client.query(
        "INSERT INTO transaction_audit (transaction_id, actor_id, actor_role, action, note) VALUES ($1,$2,$3,'rejected',$4)",
        [txn.id, req.user.id, req.user.role, 'Auto-rejected: room-share slots full']);
      // Return this deal's reserved slot so the listing reflects availability.
      await client.query(`UPDATE listings l
         SET room_share_slots_filled = GREATEST(l.room_share_slots_filled - 1, 0),
             is_available = (l.room_share_slots_filled - 1 < l.room_share_slots)
         WHERE id=$1`, [deal.listing_id]);
      await client.query('COMMIT');
      return res.status(409).json({ error: 'All room-share slots are filled. The deal has been cancelled — please refund the tenant.' });
    }

    // Secure escrow (status guard keeps this idempotent).
    const dealUpdate = await client.query(
      `UPDATE deals SET status='escrow_held', payment_reference=$1, updated_at=NOW()
       WHERE id=$2 AND status IN ('initiated','payment_pending') RETURNING *`,
      [txn.reference, deal.id]);
    if (!dealUpdate.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Deal is no longer awaiting payment — cannot approve.' });
    }

    await client.query("UPDATE listings SET is_available=false WHERE id=$1", [deal.listing_id]);
    await client.query(
      "UPDATE payment_transactions SET status='approved', reviewed_by=$1, reviewed_at=NOW(), review_note=$2, updated_at=NOW() WHERE id=$3",
      [req.user.id, note || 'Approved by admin', txn.id]);
    await client.query(
      "INSERT INTO transaction_audit (transaction_id, actor_id, actor_role, action, note) VALUES ($1,$2,$3,'approved',$4)",
      [txn.id, req.user.id, req.user.role, note || 'Approved by admin']);
    await client.query('COMMIT');

    // Parties for notifications + SwiftDoc (agent gets "payment secured" email).
    const listingFull = (await pool.query('SELECT * FROM listings WHERE id=$1', [deal.listing_id])).rows[0];
    const tenant = (await pool.query('SELECT * FROM users WHERE id=$1', [deal.tenant_id])).rows[0];
    const agent  = (await pool.query('SELECT * FROM users WHERE id=$1', [deal.agent_id])).rows[0];

    // Receipt to tenant + admin approval notice (best-effort, non-blocking).
    (async () => {
      try {
        const paid = Number(txn.amount_naira || deal.total_paid);
        if (tenant?.email) {
          const rEmail = await handleEmail({
            to: tenant.email,
            subject: '🛡️ SouthSwift — Payment Receipt & Escrow Confirmed',
            html: `<h2>Payment Received & Secured in Escrow</h2>
              <p>Dear ${escapeHtml(tenant.full_name)},</p>
              <p>Your transfer for <strong>${escapeHtml(listingFull.title)}</strong> has been confirmed by SouthSwift.</p>
              <p><strong>Receipt / Transaction ID:</strong> ${txn.reference}</p>
              <p><strong>Amount paid:</strong> ₦${paid.toLocaleString()}</p>
              <p><strong>Deal ID:</strong> ${deal.id}</p>
              <p>₦${Number(deal.rent_amount).toLocaleString()} is now held securely in SwiftShield escrow. Your tenancy agreement will follow, and funds release to your agent after you confirm move-in.</p>`,
          });
          if (rEmail && rEmail.ok) {
            await pool.query("UPDATE payment_transactions SET receipt_sent_at=NOW() WHERE id=$1", [txn.id]).catch(() => {});
            await pool.query(
              "INSERT INTO transaction_audit (transaction_id, actor_id, actor_role, action) VALUES ($1,$2,$3,'receipt_sent')",
              [txn.id, req.user.id, req.user.role]).catch(() => {});
          }
        }
        await handleEmail({
          to: ADMIN_NOTIFY_EMAIL,
          subject: '🛡️ ADMIN: Transfer Approved — Escrow Secured',
          html: `<h2>Transfer approved</h2>
            <p><strong>Transaction:</strong> ${txn.reference}</p>
            <p><strong>Approved by:</strong> ${escapeHtml(req.user.full_name)} (${req.user.email})</p>
            <p><strong>Deal ID:</strong> ${deal.id}</p>
            <p><strong>Amount:</strong> ₦${paid.toLocaleString()}</p>`,
        });
      } catch (e) { console.error('reviewTransaction notify error:', e.message); }
    })();

    // Generate SwiftDoc in background (emails agent "payment secured in escrow").
    runSwiftDocBackground({ deal: dealUpdate.rows[0], listing: listingFull, tenant, agent }).catch(() => {});

    res.json({ message: '✅ Transfer approved. Funds secured in SwiftShield escrow.', transaction_id: txn.id });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('reviewTransaction error:', err.message);
    res.status(500).json({ error: 'Something went wrong reviewing the transaction.' });
  } finally {
    client.release();
  }
};

// GET /api/payments/transaction/:dealId — tenant's own latest transfer for a deal.
const getMyTransaction = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM payment_transactions WHERE deal_id=$1 AND tenant_id=$2 ORDER BY created_at DESC LIMIT 1`,
      [req.params.dealId, req.user.id]
    );
    res.json({ transaction: result.rows[0] || null });
  } catch (err) { console.error(err.message); res.status(500).json({ error: 'Something went wrong.' }); }
};

module.exports = { getCompanyAccount, submitTransfer, listTransactions, getTransaction, reviewTransaction, getMyTransaction, generateTxnReference, getNigerianBanks };
