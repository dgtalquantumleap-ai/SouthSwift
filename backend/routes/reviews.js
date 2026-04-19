const express = require('express');
const router  = express.Router();
const { submitReview, getAgentReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/',                  protect, submitReview);
router.get('/agent/:agentId',              getAgentReviews);

module.exports = router;
