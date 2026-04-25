const Task = require('../models/Task');
const Board = require('../models/Board');
const User = require('../models/User');

const ORDERABLE_STATUSES = ['todo', 'in_progress', 'submitted', 'approved', 'rejected'];

function normalizeStatus(status) {
  return ORDERABLE_STATUSES.includes(status) ? status : 'todo';
}

async function insertAndReindex({ boardId, status, taskId, order }) {
  const items = await Task.find({ board: boardId, status }).sort({ order: 1, createdAt: 1 });
  const filtered = items.filter((item) => String(item._id) !== String(taskId));
  const nextOrder = Math.max(0, Math.min(order, filtered.length));
  const movingTask = await Task.findById(taskId);
  filtered.splice(nextOrder, 0, movingTask);

  await Promise.all(
    filtered.map((item, index) => {
      item.order = index;
      item.status = status;
      return item.save();
    })
  );
}

async function reindexStatus(boardId, status) {
  const items = await Task.find({ board: boardId, status }).sort({ order: 1, createdAt: 1 });
  await Promise.all(
    items.map((item, index) => {
      item.order = index;
      return item.save();
    })
  );
}

async function createTask(req, res) {
  const { boardId, title, description = '', branch = '', assigneeId, status = 'todo', taskNo } = req.body;
  const board = await Board.findById(boardId);
  if (!board) {
    return res.status(404).json({ message: 'Board not found' });
  }

  const assignee = assigneeId ? await User.findById(assigneeId) : null;

  const lastTask = await Task.findOne({ board: boardId, status: normalizeStatus(status) }).sort({ order: -1 });
  const lastTaskNo = await Task.findOne({ board: boardId }).sort({ taskNo: -1 });
  const computedTaskNo = Number.isFinite(Number(taskNo)) ? Number(taskNo) : (lastTaskNo?.taskNo || 0) + 1;

  const task = await Task.create({
    board: board._id,
    title,
    description,
    branch,
    assignee: assignee?._id,
    status: normalizeStatus(status),
    taskNo: computedTaskNo,
    order: lastTask ? lastTask.order + 1 : 0
  });

  res.status(201).json({ task });
}

async function moveTask(req, res) {
  const { id } = req.params;
  const { status, order = 0 } = req.body;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const nextStatus = normalizeStatus(status);
  if (req.user.role !== 'super_admin') {
    if (String(task.assignee) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only move your own tasks' });
    }

    if (nextStatus === 'approved' || nextStatus === 'rejected') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const currentIndex = ['todo', 'in_progress', 'submitted'].indexOf(task.status);
    const nextIndex = ['todo', 'in_progress', 'submitted'].indexOf(nextStatus);
    if (nextStatus !== task.status && nextIndex !== currentIndex + 1) {
      return res.status(403).json({ message: 'Invalid status transition' });
    }
  }

  const previousStatus = task.status;
  task.status = nextStatus;
  await task.save();

  await insertAndReindex({ boardId: task.board, status: nextStatus, taskId: id, order });
  if (previousStatus !== nextStatus) {
    await reindexStatus(task.board, previousStatus);
  }

  const updatedTask = await Task.findById(id).populate('assignee', 'name email handle role');
  res.json({ task: updatedTask });
}

async function updateTask(req, res) {
  const { id } = req.params;
  const { title, description, branch, assigneeId, status, taskNo } = req.body;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  if (title !== undefined) task.title = String(title).trim();
  if (description !== undefined) task.description = String(description);
  if (branch !== undefined) task.branch = String(branch);
  if (status !== undefined) task.status = normalizeStatus(status);
  if (taskNo !== undefined && Number.isFinite(Number(taskNo))) task.taskNo = Number(taskNo);

  if (assigneeId) {
    const assignee = await User.findById(assigneeId);
    task.assignee = assignee?._id || undefined;
  }

  await task.save();
  const populated = await Task.findById(id).populate('assignee', 'name email handle role');
  res.json({ task: populated });
}

async function approveTask(req, res) {
  const { id } = req.params;
  const task = await Task.findById(id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  task.status = 'approved';
  task.approvedAt = new Date();
  task.approvedBy = req.user._id;

  const nextOrder = await Task.countDocuments({ board: task.board, status: 'approved' });
  task.order = nextOrder;
  await task.save();
  await reindexStatus(task.board, 'submitted');

  res.json({ task });
}

async function rejectTask(req, res) {
  const { id } = req.params;
  const task = await Task.findById(id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  task.status = 'rejected';
  const nextOrder = await Task.countDocuments({ board: task.board, status: 'rejected' });
  task.order = nextOrder;
  await task.save();
  await reindexStatus(task.board, 'submitted');

  res.json({ task });
}

async function deleteTask(req, res) {
  const { id } = req.params;
  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const oldBoard = task.board;
  const oldStatus = task.status;
  await Task.findByIdAndDelete(id);
  await reindexStatus(oldBoard, oldStatus);
  res.json({ message: 'Task deleted' });
}

async function listMyTasks(req, res) {
  const tasks = await Task.find({ assignee: req.user._id })
    .populate('assignee', 'name email handle role')
    .populate('board', 'name')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ tasks });
}

module.exports = { createTask, moveTask, updateTask, approveTask, rejectTask, deleteTask, listMyTasks };
