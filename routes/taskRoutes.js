const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const superAdminOnly = require('../middleware/superAdminOnly');
const {
  createTask,
  moveTask,
  updateTask,
  approveTask,
  rejectTask,
  deleteTask,
  listMyTasks
} = require('../controllers/taskController');

router.use(authMiddleware);

router.post('/', superAdminOnly, createTask);
router.get('/my', listMyTasks);
router.patch('/:id/move', moveTask);
router.patch('/:id', superAdminOnly, updateTask);
router.patch('/:id/approve', superAdminOnly, approveTask);
router.patch('/:id/reject', superAdminOnly, rejectTask);
router.delete('/:id', superAdminOnly, deleteTask);

module.exports = router;
