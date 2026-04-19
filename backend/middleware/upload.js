const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const listingStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'southswift/listings', allowed_formats: ['jpg','jpeg','png','webp'] },
});

const agentDocStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'southswift/agent-docs',
    allowed_formats: ['jpg','jpeg','png','pdf'],
    public_id: `${req.user.id}-${file.fieldname}-${Date.now()}`,
  }),
});

const uploadListingImages = multer({ storage: listingStorage, limits: { files: 6 } })
  .array('images', 6);

const uploadAgentDocs = multer({ storage: agentDocStorage })
  .fields([
    { name: 'id_document', maxCount: 1 },
    { name: 'selfie',      maxCount: 1 },
  ]);

module.exports = { uploadListingImages, uploadAgentDocs };
