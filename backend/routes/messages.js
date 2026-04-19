const express = require('express');
const router  = express.Router();
const { sendMessage, getMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.post('/send',       protect, sendMessage);
router.get('/:dealId',     protect, getMessages);

module.exports = router;
