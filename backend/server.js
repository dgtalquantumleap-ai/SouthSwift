require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { pool }   = require('./config/db');

const authRoutes    = require('./routes/auth');
const agentRoutes   = require('./routes/agents');
const listingRoutes = require('./routes/listings');
const dealRoutes    = require('./routes/deals');
const adminRoutes   = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');
const reviewRoutes   = require('./routes/reviews');
const waitlistRoutes = require('./routes/waitlist');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🛡️ SouthSwift API is running',
    version: '1.0.0',
    platform: "Nigeria's Verified Property Transaction Platform"
  });
});

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/agents',   agentRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/deals',    dealRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/waitlist', waitlistRoutes);

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on SouthSwift servers.' });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🛡️  SouthSwift backend running on port ${PORT}`);
  
  // Test database connection (non-blocking)
  if (process.env.DATABASE_URL) {
    pool.query('SELECT NOW()', (err) => {
      if (err) console.error('❌ Database connection failed:', err.message);
      else     console.log('✅ PostgreSQL database connected');
    });
  } else {
    console.warn('⚠️  DATABASE_URL not set. Database features will be unavailable.');
  }
});
