const express = require('express');
const router  = express.Router();
const { agentController } = require('../controllers/agentAdminController');
const { protect, agentOnly } = require('../middleware/auth');

router.get('/',                   agentController.getAgents);
router.get('/:id',                agentController.getAgent);
router.post('/verify-request',    protect, agentOnly, agentController.submitVerification);
router.get('/my/listings',        protect, agentOnly, agentController.getAgentListings);

module.exports = router;
