require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const boardRoutes = require('./routes/boardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const importRoutes = require('./routes/importRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Ween PMS API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/import', importRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`Ween PMS API running on port ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
