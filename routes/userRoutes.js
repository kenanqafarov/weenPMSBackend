const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { me, listUsers } = require('../controllers/userController');

router.get('/', authMiddleware, listUsers);
router.get('/me', authMiddleware, me);

module.exports = router;
