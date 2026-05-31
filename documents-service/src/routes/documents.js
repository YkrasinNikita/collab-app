const express = require('express');
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const logger = require('../logger');
const router = express.Router();

router.use(auth);

router.post('/', async (req, res) => {
  try {
    const doc = new Document({ ...req.body, owner: req.userId });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    logger.error({ err }, 'Create document error');
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.userId }).sort('-updatedAt').select('_id title updatedAt');
    res.json(docs);
  } catch (err) {
    logger.error({ err }, 'Get documents error');
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) {
    logger.error({ err }, 'Get document error');
    res.status(500).json({ message: err.message });
  }
});

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
    logger.error({ err }, 'Update document error');
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!doc) return res.status(404).json({ message: 'Not found or not owner' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error({ err }, 'Delete document error');
    res.status(500).json({ message: err.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids must be an array' });
    const docs = await Document.find({ _id: { $in: ids } }).select('_id title updatedAt');
    res.json(docs);
  } catch (err) {
    logger.error({ err }, 'Batch documents error');
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;