require('dotenv').config();

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Board = require('./models/Board');
const Task = require('./models/Task');
const User = require('./models/User');

const HANDLE_TO_EMAIL = {
  '@knanqafaro': 'kenan@ween.com',
  '@umitalizade': 'umit@ween.com',
  '@aykhan': 'ayhan@ween.com'
};

function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
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

async function run() {
  const csvPath = process.argv[2];
  const createdByEmail = process.argv[3] || 'kenan@ween.com';

  if (!csvPath) {
    throw new Error('Usage: node importCsvFile.js <csvPath> [createdByEmail]');
  }

  const absolutePath = path.resolve(csvPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const rows = await parseCsvFile(absolutePath);
  const creator = await User.findOne({ email: createdByEmail });
  if (!creator) {
    throw new Error(`Creator user not found: ${createdByEmail}`);
  }

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
          createdBy: creator._id,
          order: boardOrder++
        })
      );
    }
  }

  const boardLookup = new Map([...existingBoards, ...createdBoards].map((board) => [board.name, board]));

  const users = await User.find({});
  const userByHandle = new Map(users.map((user) => [user.handle, user]));
  const userByEmail = new Map(users.map((user) => [user.email, user]));

  let tasksCreated = 0;
  for (const row of rows) {
    const boardName = String(row['List Name'] || '').trim();
    const board = boardLookup.get(boardName);
    if (!board) {
      continue;
    }

    const taskNo = Number(row['Task No']);
    const title = String(row['Card Name'] || '').trim();
    if (!Number.isFinite(taskNo) || !title) {
      continue;
    }

    const duplicate = await Task.exists({ board: board._id, taskNo, title });
    if (duplicate) {
      continue;
    }

    const assigneeHandle = String(row.Members || '').trim();
    const assigneeEmail = HANDLE_TO_EMAIL[assigneeHandle];
    const assignee = userByHandle.get(assigneeHandle) || (assigneeEmail ? userByEmail.get(assigneeEmail) : null);

    const order = await Task.countDocuments({ board: board._id, status: 'todo' });
    await Task.create({
      taskNo,
      title,
      description: String(row['Card Description'] || ''),
      branch: String(row.Branch || ''),
      board: board._id,
      assignee: assignee?._id,
      status: 'todo',
      order
    });

    tasksCreated += 1;
  }

  console.log(`Imported tasks: ${tasksCreated}`);
  console.log(`Boards created: ${createdBoards.length}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch (_error) {
    // no-op
  }
  process.exit(1);
});
