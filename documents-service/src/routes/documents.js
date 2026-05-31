const express = require('express');
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const router = express.Router();

router.use(auth);

// Создать заметку
router.post('/', async (req, res) => {
  try {
    const doc = new Document({ ...req.body, owner: req.userId });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить все заметки текущего пользователя (владельца)
router.get('/', async (req, res) => {
  const docs = await Document.find({ owner: req.userId }).sort('-updatedAt').select('_id title updatedAt');
  res.json(docs);
});

// Получить одну заметку (любой авторизованный, проверка прав на фронтенде)
router.get('/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

// Обновить заметку (разрешено всем авторизованным, контроль прав на фронтенде)
router.put('/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Удалить заметку (только владелец)
router.delete('/:id', async (req, res) => {
  const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!doc) return res.status(404).json({ message: 'Not found or not owner' });
  res.json({ message: 'Deleted' });
});

// Batch-загрузка
router.post('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids must be an array' });
    const docs = await Document.find({ _id: { $in: ids } }).select('_id title updatedAt');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;