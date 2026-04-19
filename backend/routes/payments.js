// ── payments.js ──────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');

// Paystack webhook — called by Paystack when payment is confirmed
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const crypto = require('crypto');
  const hash   = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                        .update(req.body).digest('hex');
  if (hash !== req.headers['x-paystack-signature'])
    return res.status(401).json({ error: 'Invalid webhook signature.' });

  const event = JSON.parse(req.body);
  if (event.event === 'charge.success') {
    const { dealController } = require('../controllers/dealController');
    // Verify via reference
    await dealController?.verifyPayment?.({ body: { reference: event.data.reference } }, res);
  } else {
    res.json({ received: true });
  }
});

router.get('/verify/:reference', protect, async (req, res) => {
  req.body = { reference: req.params.reference };
  const { verifyPayment } = require('../controllers/dealController');
  return verifyPayment(req, res);
});

module.exports = router;
