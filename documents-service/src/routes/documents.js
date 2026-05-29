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

// Получить все заметки текущего пользователя
router.get('/', async (req, res) => {
  const docs = await Document.find({ owner: req.userId }).sort('-updatedAt');
  res.json(docs);
});

// Получить одну заметку (без проверки прав – это сделает шлюз)
router.get('/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

// Обновить заметку (только владелец)
router.put('/:id', async (req, res) => {
  const doc = await Document.findOneAndUpdate(
    { _id: req.params.id, owner: req.userId },
    req.body,
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Not found or not owner' });
  res.json(doc);
});

// Удалить заметку (только владелец)
router.delete('/:id', async (req, res) => {
  const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;