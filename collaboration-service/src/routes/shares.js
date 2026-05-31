const express = require('express');
const auth = require('../middleware/auth');
const Share = require('../models/Share');
const axios = require('axios');
const router = express.Router();
router.use(auth);

// POST / – поделиться (устарело, используется приглашения)
router.post('/', async (req, res) => {
  try {
    const { documentId, documentType, sharedWithEmail, permission } = req.body;
    const share = new Share({ documentId, documentType, ownerId: req.userId, sharedWith: sharedWithEmail, permission });
    await share.save();
    res.status(201).json(share);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /document/:documentId – список доступов (для всех, кто имеет доступ)
router.get('/document/:documentId', async (req, res) => {
  // Возвращаем все shares для документа без фильтрации по владельцу
  const shares = await Share.find({ documentId: req.params.documentId });
  res.json(shares);
});

// GET /check/:documentId – проверка прав текущего пользователя
router.get('/check/:documentId', async (req, res) => {
  const share = await Share.findOne({ documentId: req.params.documentId, sharedWith: req.userId });
  if (!share) {
    // проверить, не владелец ли
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
});

// GET /my – все документы, к которым есть доступ
router.get('/my', async (req, res) => {
  try {
    const shares = await Share.find({ sharedWith: req.userId }).select('documentId documentType permission');
    res.json(shares);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /:id – изменить права (только владелец)
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /:id – удалить доступ (только владелец)
router.delete('/:id', async (req, res) => {
  try {
    const share = await Share.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!share) return res.status(404).json({ message: 'Share not found or not owner' });
    res.json({ message: 'Access removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;