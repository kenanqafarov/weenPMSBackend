const router = require('express').Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const superAdminOnly = require('../middleware/superAdminOnly');
const { importCsv } = require('../controllers/importController');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.post('/csv', superAdminOnly, upload.single('file'), importCsv);

module.exports = router;
