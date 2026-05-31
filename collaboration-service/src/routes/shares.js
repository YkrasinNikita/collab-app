const express = require('express');
const auth = require('../middleware/auth');
const Share = require('../models/Share');
const axios = require('axios');
const logger = require('../logger');
const router = express.Router();
router.use(auth);

router.post('/', async (req, res) => {
  try {
    const { documentId, documentType, sharedWithEmail, permission } = req.body;
    const share = new Share({ documentId, documentType, ownerId: req.userId, sharedWith: sharedWithEmail, permission });
    await share.save();
    res.status(201).json(share);
  } catch (err) {
    logger.error({ err }, 'Create share error');
    res.status(500).json({ message: err.message });
  }
});

router.get('/document/:documentId', async (req, res) => {
  try {
    const shares = await Share.find({ documentId: req.params.documentId });
    res.json(shares);
  } catch (err) {
    logger.error({ err }, 'Get shares error');
    res.status(500).json({ message: err.message });
  }
});

router.get('/check/:documentId', async (req, res) => {
  try {
    const share = await Share.findOne({ documentId: req.params.documentId, sharedWith: req.userId });
    if (!share) {
      try {
        const docType = req.query.type || 'document';
        const docServiceUrl = process.env.DOCUMENTS_SERVICE_URL || 'http://documents-service:4002';
        const response = await axios.get(`${docServiceUrl}/api/${docType}s/${req.params.documentId}`, {
          headers: { Authorization: req.headers.authorization }
        });
        const doc = response.data;
        if (doc.owner === req.userId) return res.json({ permission: 'edit' });
      } catch (e) {}
      return res.json({ permission: null });
    }
    res.json({ permission: share.permission });
  } catch (err) {
    logger.error({ err }, 'Check share error');
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', async (req, res) => {
  try {
    const shares = await Share.find({ sharedWith: req.userId }).select('documentId documentType permission');
    res.json(shares);
  } catch (err) {
    logger.error({ err }, 'Get my shares error');
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { permission } = req.body;
    const share = await Share.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { permission },
      { new: true }
    );
    if (!share) return res.status(404).json({ message: 'Share not found or not owner' });
    res.json(share);
  } catch (err) {
    logger.error({ err }, 'Update share error');
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const share = await Share.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!share) return res.status(404).json({ message: 'Share not found or not owner' });
    res.json({ message: 'Access removed' });
  } catch (err) {
    logger.error({ err }, 'Delete share error');
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;