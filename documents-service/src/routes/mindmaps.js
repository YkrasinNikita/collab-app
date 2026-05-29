const express = require('express');
const auth = require('../middleware/auth');
const MindMap = require('../models/MindMap');
const router = express.Router();

router.use(auth);

// Создать ментальную карту
router.post('/', async (req, res) => {
  try {
    const map = new MindMap({ ...req.body, owner: req.userId });
    await map.save();
    res.status(201).json(map);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить все карты пользователя
router.get('/', async (req, res) => {
  const maps = await MindMap.find({ owner: req.userId }).sort('-updatedAt');
  res.json(maps);
});

// Получить одну карту
router.get('/:id', async (req, res) => {
  const map = await MindMap.findById(req.params.id);
  if (!map) return res.status(404).json({ message: 'Not found' });
  res.json(map);
});

// Обновить карту (только владелец)
router.put('/:id', async (req, res) => {
  const map = await MindMap.findOneAndUpdate(
    { _id: req.params.id, owner: req.userId },
    req.body,
    { new: true }
  );
  if (!map) return res.status(404).json({ message: 'Not found or not owner' });
  res.json(map);
});

// Удалить карту
router.delete('/:id', async (req, res) => {
  const map = await MindMap.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!map) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;