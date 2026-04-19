const { pool } = require('../config/db');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /api/listings — all available listings with filters
const getListings = async (req, res) => {
  const { city, state, min_price, max_price, bedrooms, property_type, swiftshield } = req.query;
  let query = `
    SELECT l.*, u.full_name AS agent_name, u.phone AS agent_phone,
           ap.verification_status, ap.rating AS agent_rating, ap.total_deals
    FROM listings l
    JOIN users u ON u.id = l.agent_id
    LEFT JOIN agent_profiles ap ON ap.user_id = l.agent_id
    WHERE l.is_available = true
  `;
  const params = [];
  let idx = 1;

  if (city)          { query += ` AND LOWER(l.city) = LOWER($${idx++})`;   params.push(city); }
  if (state)         { query += ` AND LOWER(l.state) = LOWER($${idx++})`;  params.push(state); }
  if (min_price)     { query += ` AND l.rent_price >= $${idx++}`;           params.push(min_price); }
  if (max_price)     { query += ` AND l.rent_price <= $${idx++}`;           params.push(max_price); }
  if (bedrooms)      { query += ` AND l.bedrooms >= $${idx++}`;             params.push(bedrooms); }
  if (property_type) { query += ` AND l.property_type = $${idx++}`;         params.push(property_type); }
  if (swiftshield === 'true') { query += ` AND l.is_swiftshield = true`; }

  query += ' ORDER BY l.created_at DESC LIMIT 50';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/listings/:id
const getListing = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.full_name AS agent_name, u.phone AS agent_phone, u.email AS agent_email,
              ap.verification_status, ap.agency_name, ap.rating AS agent_rating,
              ap.total_deals, ap.bio AS agent_bio
       FROM listings l
       JOIN users u ON u.id = l.agent_id
       LEFT JOIN agent_profiles ap ON ap.user_id = l.agent_id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/listings — agent creates listing
const createListing = async (req, res) => {
  const {
    title, description, property_type, bedrooms, bathrooms,
    rent_price, rent_period, address, city, state, amenities,
    latitude, longitude
  } = req.body;

  if (!title || !rent_price || !address || !city || !state)
    return res.status(400).json({ error: 'Title, price, address, city, and state are required.' });

  try {
    // Check agent is verified
    const agentCheck = await pool.query(
      "SELECT verification_status FROM agent_profiles WHERE user_id=$1", [req.user.id]
    );
    if (!agentCheck.rows.length || agentCheck.rows[0].verification_status !== 'verified') {
      return res.status(403).json({ error: 'Only verified agents can create listings.' });
    }

    const images = req.files && req.files.length > 0
      ? req.files.map(f => f.path)
      : (Array.isArray(req.body.images) ? req.body.images : []);

    const result = await pool.query(
      `INSERT INTO listings
       (agent_id, title, description, property_type, bedrooms, bathrooms,
        rent_price, rent_period, address, city, state, amenities, images, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [req.user.id, title, description, property_type||'apartment',
       bedrooms||1, bathrooms||1, rent_price, rent_period||'yearly',
       address, city, state, amenities||[], images, latitude||null, longitude||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/listings/:id
const updateListing = async (req, res) => {
  const fields = ['title','description','rent_price','bedrooms','bathrooms','address','city','state','is_available','amenities'];
  const updates = []; const params = [];
  let idx = 1;
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${idx++}`); params.push(req.body[f]); }
  });
  if (!updates.length) return res.status(400).json({ error: 'No fields to update.' });
  params.push(req.params.id, req.user.id);
  try {
    await pool.query(
      `UPDATE listings SET ${updates.join(',')}, updated_at=NOW() WHERE id=$${idx} AND agent_id=$${idx+1}`,
      params
    );
    res.json({ message: 'Listing updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/listings/:id
const deleteListing = async (req, res) => {
  try {
    await pool.query('DELETE FROM listings WHERE id=$1 AND agent_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Listing deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/listings/agent/my — agent's own listings
const getMyListings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM listings WHERE agent_id=$1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getListings, getListing, createListing, updateListing, deleteListing, getMyListings };
