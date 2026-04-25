const Board = require('../models/Board');
const Task = require('../models/Task');

async function listBoards(_req, res) {
  const boards = await Board.find({}).sort({ order: 1, createdAt: 1 }).lean();
  const boardIds = boards.map((board) => board._id);

  const counts = await Task.aggregate([
    { $match: { board: { $in: boardIds } } },
    { $group: { _id: '$board', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));

  const taskSamples = await Task.find({ board: { $in: boardIds } })
    .populate('assignee', 'name email handle role')
    .sort({ createdAt: -1 })
    .lean();

  const sampleMap = new Map();
  for (const task of taskSamples) {
    const key = String(task.board);
    if (!sampleMap.has(key)) {
      sampleMap.set(key, []);
    }
    const handles = sampleMap.get(key);
    if (task.assignee && !handles.find((member) => String(member._id) === String(task.assignee._id))) {
      handles.push(task.assignee);
    }
  }

  const result = boards.map((board) => ({
    ...board,
    taskCount: countMap.get(String(board._id)) || 0,
    members: sampleMap.get(String(board._id)) || []
  }));

  res.json({ boards: result });
}

async function createBoard(req, res) {
  const { name } = req.body;
  const lastBoard = await Board.findOne({}).sort({ order: -1 });

  const board = await Board.create({
    name,
    createdBy: req.user._id,
    order: lastBoard ? lastBoard.order + 1 : 0
  });

  res.status(201).json({ board });
}

async function deleteBoard(req, res) {
  const { id } = req.params;
  await Task.deleteMany({ board: id });
  await Board.findByIdAndDelete(id);
  res.json({ message: 'Board deleted' });
}

async function getBoardTasks(req, res) {
  const { id } = req.params;
  const board = await Board.findById(id).lean();
  const tasks = await Task.find({ board: id })
    .populate('assignee', 'name email handle role')
    .populate('approvedBy', 'name email handle role')
    .sort({ status: 1, order: 1, createdAt: 1 })
    .lean();

  const grouped = {
    todo: [],
    in_progress: [],
    submitted: [],
    approved: [],
    rejected: []
  };

  for (const task of tasks) {
    grouped[task.status].push(task);
  }

  res.json({ board, tasks: grouped });
}

module.exports = { listBoards, createBoard, deleteBoard, getBoardTasks };
