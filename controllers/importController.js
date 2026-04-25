const csv = require('csv-parser');
const { Readable } = require('stream');
const Board = require('../models/Board');
const Task = require('../models/Task');
const User = require('../models/User');

const HANDLE_TO_EMAIL = {
  '@knanqafaro': 'kenan@ween.com',
  '@umitalizade': 'umit@ween.com',
  '@aykhan': 'ayhan@ween.com'
};

async function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer)
      .pipe(
        csv({
          mapHeaders: ({ header }) => String(header || '').replace(/^\uFEFF/, '').trim()
        })
      )
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function importCsv(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'CSV file is required' });
  }

  const rows = await parseCsv(req.file.buffer);
  const uniqueBoardNames = [...new Set(rows.map((row) => String(row['List Name'] || '').trim()).filter(Boolean))];
  const existingBoards = await Board.find({ name: { $in: uniqueBoardNames } });
  const existingNames = new Set(existingBoards.map((board) => board.name));

  let boardOrder = await Board.countDocuments();

  const createdBoards = [];
  for (const name of uniqueBoardNames) {
    if (!existingNames.has(name)) {
      createdBoards.push(
        await Board.create({
          name,
          createdBy: req.user._id,
          order: boardOrder++
        })
      );
    }
  }

  const boardLookup = new Map(
    [...existingBoards, ...createdBoards].map((board) => [board.name, board])
  );

  const userByHandle = new Map();
  const userByEmail = new Map();
  const users = await User.find({});
  for (const user of users) {
    userByHandle.set(user.handle, user);
    userByEmail.set(user.email, user);
  }

  let createdTasks = 0;
  for (const row of rows) {
    const board = boardLookup.get(String(row['List Name'] || '').trim());
    if (!board) {
      continue;
    }

    const assigneeHandle = String(row.Members || '').trim();
    const assigneeEmail = HANDLE_TO_EMAIL[assigneeHandle];
    const assignee = userByHandle.get(assigneeHandle) || (assigneeEmail ? userByEmail.get(assigneeEmail) : null);

    const taskNo = Number(row['Task No']);
    const title = String(row['Card Name'] || '').trim();
    if (!Number.isFinite(taskNo) || !title) {
      continue;
    }

    const duplicate = await Task.exists({ board: board._id, taskNo, title });
    if (duplicate) {
      continue;
    }

    const nextOrder = await Task.countDocuments({ board: board._id, status: 'todo' });
    await Task.create({
      taskNo,
      title,
      description: String(row['Card Description'] || ''),
      branch: String(row.Branch || ''),
      board: board._id,
      assignee: assignee?._id,
      status: 'todo',
      order: nextOrder
    });
    createdTasks += 1;
  }

  res.json({ boardsCreated: createdBoards.length, tasksCreated: createdTasks });
}

module.exports = { importCsv };

