const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    taskNo: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    branch: { type: String, default: '' },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'submitted', 'approved', 'rejected'],
      default: 'todo'
    },
    order: { type: Number, default: 0 },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Task', taskSchema);
