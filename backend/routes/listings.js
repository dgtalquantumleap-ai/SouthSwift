const express  = require('express');
const router   = express.Router();
const { getListings, getListing, createListing, updateListing, deleteListing, getMyListings } = require('../controllers/listingController');
const { protect, agentOnly } = require('../middleware/auth');
const { uploadListingImages } = require('../middleware/upload');

router.get('/',              getListings);
router.get('/agent/my',      protect, agentOnly, getMyListings);
router.get('/:id',           getListing);
router.post('/', protect, agentOnly, (req, res, next) => {
  uploadListingImages(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, createListing);
router.put('/:id',           protect, agentOnly, updateListing);
router.delete('/:id',        protect, agentOnly, deleteListing);

module.exports = router;
