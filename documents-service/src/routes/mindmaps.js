const express = require('express');
const auth = require('../middleware/auth');
const MindMap = require('../models/MindMap');
const axios = require('axios');
const logger = require('../logger');
const router = express.Router();

router.use(auth);

router.post('/', async (req, res) => {
  try {
    const { title, nodes = [], edges = [] } = req.body;
    const map = new MindMap({ title, nodes, edges, owner: req.userId });
    await map.save();
    res.status(201).json(map);
  } catch (err) {
    logger.error({ err }, 'Ошибка создания карты');
    res.status(500).json({ message: 'Ошибка при создании ментальной карты' });
  }
});

router.get('/', async (req, res) => {
  try {
    const maps = await MindMap.find({ owner: req.userId }).sort('-updatedAt').select('_id title updatedAt');
    res.json(maps);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения карт');
    res.status(500).json({ message: 'Ошибка при загрузке ментальных карт' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const map = await MindMap.findById(req.params.id);
    if (!map) return res.status(404).json({ message: 'Ментальная карта не найдена' });
    res.json(map);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения карты');
    res.status(500).json({ message: 'Ошибка при загрузке ментальной карты' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const map = await MindMap.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!map) return res.status(404).json({ message: 'Ментальная карта не найдена' });
    res.json(map);
  } catch (err) {
    logger.error({ err }, 'Ошибка обновления карты');
    res.status(500).json({ message: 'Ошибка при обновлении ментальной карты' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const map = await MindMap.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!map) return res.status(404).json({ message: 'Ментальная карта не найдена или вы не владелец' });
    try {
      await axios.post('http://collaboration-service:4003/api/internal/document-deleted', {
        documentId: req.params.id,
      });
    } catch (e) {
      logger.error('Не удалось уведомить collaboration-service об удалении');
    }
    res.json({ message: 'Ментальная карта удалена' });
  } catch (err) {
    logger.error({ err }, 'Ошибка удаления карты');
    res.status(500).json({ message: 'Ошибка при удалении ментальной карты' });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids должен быть массивом' });
    const maps = await MindMap.find({ _id: { $in: ids } }).select('_id title updatedAt');
    res.json(maps);
  } catch (err) {
    logger.error({ err }, 'Ошибка пакетной загрузки карт');
    res.status(500).json({ message: 'Ошибка при пакетной загрузке ментальных карт' });
  }
});

module.exports = router;