const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = new User({ email, password, name });
    await user.save();

    const tokens = generateTokens(user._id);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      accessToken: tokens.accessToken,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    logger.error({ err }, 'Registration error');
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const tokens = generateTokens(user._id);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      accessToken: tokens.accessToken,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Обновление токенов
router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const tokens = generateTokens(user._id);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    logger.error({ err }, 'Refresh error');
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Выход
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// Профиль текущего пользователя
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    logger.error({ err }, 'Profile error');
    res.status(500).json({ message: 'Server error' });
  }
});

// Обновить профиль
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.userId } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select(
      '-password',
    );
    res.json(user);
  } catch (err) {
    logger.error({ err }, 'Update profile error');
    res.status(500).json({ message: err.message });
  }
});

// Сменить пароль
router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Пароль изменён' });
  } catch (err) {
    logger.error({ err }, 'Change password error');
    res.status(500).json({ message: err.message });
  }
});
// Проверка занятости email
router.post('/check-email', async (req, res) => {
  try {
    const { email, excludeUserId } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const query = { email };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    const user = await User.findOne(query);
    res.json({ exists: !!user });
  } catch (err) {
    logger.error({ err }, 'Check email error');
    res.status(500).json({ message: 'Server error' });
  }
});

// Поиск пользователей
router.get('/search-users', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  try {
    const users = await User.find({
      email: { $regex: q, $options: 'i' },
      _id: { $ne: req.userId },
    })
      .select('email name')
      .limit(10);
    res.json(users.map((u) => ({ id: u._id, email: u.email, name: u.name })));
  } catch (err) {
    logger.error({ err }, 'Search users error');
    res.status(500).json({ message: err.message });
  }
});

// Получить пользователя по ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('_id email name');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    logger.error({ err }, 'Get user error');
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
