const express = require('express');
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const axios = require('axios');
const logger = require('../logger');
const router = express.Router();

router.use(auth);

// Создать заметку
router.post('/', async (req, res) => {
  try {
    const doc = new Document({ ...req.body, owner: req.userId });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    logger.error({ err }, 'Ошибка создания заметки');
    res.status(500).json({ message: 'Ошибка при создании заметки' });
  }
});

// Получить все заметки пользователя
router.get('/', async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.userId }).sort('-updatedAt').select('_id title updatedAt');
    res.json(docs);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения заметок');
    res.status(500).json({ message: 'Ошибка при загрузке заметок' });
  }
});

// Получить одну заметку
router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Заметка не найдена' });
    res.json(doc);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения заметки');
    res.status(500).json({ message: 'Ошибка при загрузке заметки' });
  }
});

// Обновить заметку
router.put('/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Заметка не найдена' });
    res.json(doc);
  } catch (err) {
    logger.error({ err }, 'Ошибка обновления заметки');
    res.status(500).json({ message: 'Ошибка при обновлении заметки' });
  }
});

// Удалить заметку
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!doc) return res.status(404).json({ message: 'Заметка не найдена или вы не владелец' });
    // Уведомить collaboration-service об удалении
    try {
      await axios.post('http://collaboration-service:4003/api/internal/document-deleted', {
        documentId: req.params.id,
      });
    } catch (e) {
      logger.error('Не удалось уведомить collaboration-service об удалении');
    }
    res.json({ message: 'Заметка удалена' });
  } catch (err) {
    logger.error({ err }, 'Ошибка удаления заметки');
    res.status(500).json({ message: 'Ошибка при удалении заметки' });
  }
});

// Пакетная загрузка
router.post('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids должен быть массивом' });
    const docs = await Document.find({ _id: { $in: ids } }).select('_id title updatedAt');
    res.json(docs);
  } catch (err) {
    logger.error({ err }, 'Ошибка пакетной загрузки заметок');
    res.status(500).json({ message: 'Ошибка при пакетной загрузке заметок' });
  }
});

module.exports = router;