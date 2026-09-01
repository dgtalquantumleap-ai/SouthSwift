const express = require('express');
const router  = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

// Auth-gated: only signed-in users can submit feedback.
router.post('/', protect, submitFeedback);

module.exports = router;

