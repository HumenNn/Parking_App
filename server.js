require('dotenv').config();
const { createServer } = require('node:http');
const attachRealtime = require('./realtime');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');

const authRoutes = require('./routes/auth');
const spacesRoutes = require('./routes/spaces');
const { authMiddleware, isAdmin } = require('./middleware/auth');
const User = require('./models/user');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (
  process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const server = createServer(app);
const { publishSpaceChange } = attachRealtime(server, allowedOrigins);
app.locals.publishSpaceChange = publishSpaceChange;

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/spaces', spacesRoutes);

app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/users/:id/max-spaces', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { maxSpaces } = req.body;
    if (!Number.isInteger(maxSpaces) || maxSpaces < 0 || maxSpaces > 50) {
      return res.status(400).json({ error: 'maxSpaces: целое число от 0 до 50' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { maxSpaces },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      maxSpaces: user.maxSpaces,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Parking API (MongoDB)',
    database: mongoose.connection.name,
  });
});

app.use((err, req, res, next) => {
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: errors.join('; ') });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Некорректное значение поля ${err.path}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Значение уже используется' });
  }
  console.error(err);
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Сервер запущен на http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });