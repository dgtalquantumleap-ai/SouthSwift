// ── payments.js ──────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { verifyPayment } = require('../controllers/dealController');
const { getCompanyAccount, submitTransfer, getMyTransaction, getNigerianBanks } = require('../controllers/paymentsController');
const { uploadReceipt } = require('../middleware/upload');

// Webhook is now mounted separately in server.js (before express.json)

router.get('/verify/:reference', protect, async (req, res) => {
  req.body = { reference: req.params.reference };
  return verifyPayment(req, res);
});

// Manual bank-transfer collection
router.get('/account', protect, getCompanyAccount);
router.get('/banks', protect, getNigerianBanks);
router.post('/submit', protect, uploadReceipt, submitTransfer);
router.get('/transaction/:dealId', protect, getMyTransaction);

module.exports = router;
