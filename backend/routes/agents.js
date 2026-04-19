const express = require('express');
const router  = express.Router();
const { agentController } = require('../controllers/agentAdminController');
const { protect, agentOnly } = require('../middleware/auth');
const { uploadAgentDocs } = require('../middleware/upload');

router.get('/',                   agentController.getAgents);
router.get('/:id',                agentController.getAgent);
router.post('/verify-request', protect, agentOnly, (req, res, next) => {
  uploadAgentDocs(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, agentController.submitVerification);
router.get('/my/listings',        protect, agentOnly, agentController.getAgentListings);

module.exports = router;
