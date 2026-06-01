const express = require('express');
const auth = require('../middleware/auth');
const Share = require('../models/Share');
const axios = require('axios');
const logger = require('../logger');
const router = express.Router();
router.use(auth);

// POST / – создание доступа (оставлено для обратной совместимости)
router.post('/', async (req, res) => {
  try {
    const { documentId, documentType, sharedWithEmail, permission } = req.body;
    const share = new Share({
      documentId,
      documentType,
      ownerId: req.userId,
      sharedWith: sharedWithEmail,
      permission,
    });
    await share.save();
    res.status(201).json(share);
  } catch (err) {
    logger.error({ err }, 'Ошибка создания доступа');
    res.status(500).json({ message: 'Ошибка при предоставлении доступа' });
  }
});

// GET /document/:documentId – список участников (для всех, у кого есть доступ)
router.get('/document/:documentId', async (req, res) => {
  try {
    const shares = await Share.find({ documentId: req.params.documentId });
    res.json(shares);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения списка участников');
    res.status(500).json({ message: 'Ошибка при получении списка участников' });
  }
});

// GET /check/:documentId – проверка прав текущего пользователя
router.get('/check/:documentId', async (req, res) => {
  try {
    const share = await Share.findOne({
      documentId: req.params.documentId,
      sharedWith: req.userId,
    });
    if (!share) {
      // Проверяем, не владелец ли
      try {
        const docType = req.query.type || 'document';
        const docServiceUrl =
          process.env.DOCUMENTS_SERVICE_URL || 'http://documents-service:4002';
        const response = await axios.get(
          `${docServiceUrl}/api/${docType}s/${req.params.documentId}`,
          { headers: { Authorization: req.headers.authorization } }
        );
        const doc = response.data;
        if (doc.owner === req.userId) return res.json({ permission: 'edit' });
      } catch (e) {}
      return res.json({ permission: null });
    }
    res.json({ permission: share.permission });
  } catch (err) {
    logger.error({ err }, 'Ошибка проверки прав');
    res.status(500).json({ message: 'Ошибка при проверке прав доступа' });
  }
});

// GET /my – все документы, к которым у текущего пользователя есть доступ
router.get('/my', async (req, res) => {
  try {
    const shares = await Share.find({ sharedWith: req.userId }).select(
      'documentId documentType permission'
    );
    res.json(shares);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения своих доступов');
    res.status(500).json({ message: 'Ошибка при получении ваших доступов' });
  }
});

// PUT /:id – изменение прав (только владелец)
router.put('/:id', async (req, res) => {
  try {
    const { permission } = req.body;
    const share = await Share.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { permission },
      { new: true }
    );
    if (!share)
      return res
        .status(404)
        .json({ message: 'Доступ не найден или вы не владелец' });
    // Уведомляем комнату об обновлении участников
    req.io.to(share.documentId).emit('participants_updated');
    // Уведомляем пользователя о смене его роли
    req.io.to(share.documentId).emit('role_changed', {
      userId: share.sharedWith,
      permission: share.permission,
      documentId: share.documentId,
    });
    res.json(share);
  } catch (err) {
    logger.error({ err }, 'Ошибка изменения прав');
    res.status(500).json({ message: 'Ошибка при изменении прав доступа' });
  }
});

// DELETE /:id – удаление доступа (только владелец)
router.delete('/:id', async (req, res) => {
  try {
    const share = await Share.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.userId,
    });
    if (!share)
      return res
        .status(404)
        .json({ message: 'Доступ не найден или вы не владелец' });
    // Уведомляем комнату об обновлении участников
    req.io.to(share.documentId).emit('participants_updated');
    // Уведомляем удалённого пользователя, что его выгнали
    req.io.to(share.documentId).emit('kicked_from_document', {
      userId: share.sharedWith,
      documentId: share.documentId,
    });
    res.json({ message: 'Доступ удалён' });
  } catch (err) {
    logger.error({ err }, 'Ошибка удаления доступа');
    res.status(500).json({ message: 'Ошибка при удалении доступа' });
  }
});

module.exports = router;