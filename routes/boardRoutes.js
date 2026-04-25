const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const superAdminOnly = require('../middleware/superAdminOnly');
const {
  listBoards,
  createBoard,
  deleteBoard,
  getBoardTasks
} = require('../controllers/boardController');

router.use(authMiddleware);

router.get('/', listBoards);
router.post('/', superAdminOnly, createBoard);
router.delete('/:id', superAdminOnly, deleteBoard);
router.get('/:id/tasks', getBoardTasks);

module.exports = router;
