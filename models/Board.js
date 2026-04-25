const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Board', boardSchema);
