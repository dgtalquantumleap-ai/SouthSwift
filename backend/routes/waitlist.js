const express = require('express');
const router  = express.Router();
const { joinWaitlist, getWaitlist } = require('../controllers/waitlistController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', joinWaitlist);
router.get('/',  protect, adminOnly, getWaitlist);

module.exports = router;
