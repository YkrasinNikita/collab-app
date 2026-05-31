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
    if (existing) return res.status(400).json({ message: 'Email уже используется' });

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
    logger.error({ err }, 'Ошибка регистрации');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Неверный email или пароль' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Неверный email или пароль' });

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
    logger.error({ err }, 'Ошибка входа');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Обновление токенов
router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'Отсутствует refresh токен' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Пользователь не найден' });

    const tokens = generateTokens(user._id);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    logger.error({ err }, 'Ошибка обновления токенов');
    res.status(401).json({ message: 'Недействительный refresh токен' });
  }
});

// Выход
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Выход выполнен' });
});

// Профиль текущего пользователя
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(user);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения профиля');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Обновить профиль (имя, email)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.userId } });
      if (existing) return res.status(400).json({ message: 'Email уже используется' });
    }
    const update = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    logger.error({ err }, 'Ошибка обновления профиля');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Сменить пароль (без текущего)
router.put('/me/password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Пароль изменён' });
  } catch (err) {
    logger.error({ err }, 'Ошибка смены пароля');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Проверка занятости email
router.post('/check-email', async (req, res) => {
  try {
    const { email, excludeUserId } = req.body;
    if (!email) return res.status(400).json({ message: 'Email обязателен' });
    const query = { email };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    const user = await User.findOne(query);
    res.json({ exists: !!user });
  } catch (err) {
    logger.error({ err }, 'Ошибка проверки email');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Поиск пользователей
router.get('/search-users', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  try {
    const users = await User.find({
      email: { $regex: q, $options: 'i' },
      _id: { $ne: req.userId }
    }).select('email name').limit(10);
    res.json(users.map(u => ({ id: u._id, email: u.email, name: u.name })));
  } catch (err) {
    logger.error({ err }, 'Ошибка поиска пользователей');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

// Получить пользователя по ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('_id email name');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(user);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения пользователя');
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;