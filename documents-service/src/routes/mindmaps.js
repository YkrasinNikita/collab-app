const express = require('express');
const auth = require('../middleware/auth');
const MindMap = require('../models/MindMap');
const router = express.Router();

router.use(auth);

router.post('/', async (req, res) => {
  try {
    const { title, nodes = [], edges = [] } = req.body;
    const map = new MindMap({ title, nodes, edges, owner: req.userId });
    await map.save();
    res.status(201).json(map);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  const maps = await MindMap.find({ owner: req.userId }).sort('-updatedAt').select('_id title updatedAt');
  res.json(maps);
});

router.get('/:id', async (req, res) => {
  const map = await MindMap.findById(req.params.id);
  if (!map) return res.status(404).json({ message: 'Not found' });
  res.json(map);
});

router.put('/:id', async (req, res) => {
  try {
    const map = await MindMap.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!map) return res.status(404).json({ message: 'Not found' });
    res.json(map);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const map = await MindMap.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!map) return res.status(404).json({ message: 'Not found or not owner' });
  res.json({ message: 'Deleted' });
});

router.post('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids must be an array' });
    const maps = await MindMap.find({ _id: { $in: ids } }).select('_id title updatedAt');
    res.json(maps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;