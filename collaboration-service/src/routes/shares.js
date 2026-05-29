const express = require('express');
const auth = require('../middleware/auth');
const Share = require('../models/Share');
const axios = require('axios');

const router = express.Router();
router.use(auth);

// Поделиться документом
router.post('/', async (req, res) => {
  try {
    const { documentId, documentType, sharedWithEmail, permission } = req.body;
    // В реальном проекте здесь нужно обратиться к auth-сервису, чтобы получить userId по email.
    // Для простоты будем считать, что sharedWithEmail — это и есть ID пользователя.
    // (упрощение: предполагаем, что фронтенд передаёт уже userId, а не email)
    const share = new Share({
      documentId,
      documentType,
      ownerId: req.userId,
      sharedWith: sharedWithEmail, // на самом деле это userId
      permission,
    });
    await share.save();
    res.status(201).json(share);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Получить все доступы к документу (только владелец может видеть)
router.get('/document/:documentId', async (req, res) => {
  const shares = await Share.find({ documentId: req.params.documentId, ownerId: req.userId });
  res.json(shares);
});

// Проверить права текущего пользователя на документ
router.get('/check/:documentId', async (req, res) => {
  // Проверяем, есть ли запись о доступе
  const share = await Share.findOne({
    documentId: req.params.documentId,
    sharedWith: req.userId,
  });
  if (!share) {
    // Если записи нет, возможно, пользователь — владелец.
    // Нужно проверить через documents-service.
    try {
      // Определяем тип документа (можно передать query-параметр, но для простоты пробуем оба)
      // В боевом коде нужно знать тип. Здесь сделаем запрос к обоим сервисам.
      // Но для упрощения предположим, что documentType известен – например, передаётся параметр ?type=document
      // В ответе будем полагаться на фронтенд, который знает тип.
      // Поскольку этот эндпоинт вызывается из Next-шлюза, добавим туда параметр type.
      const docType = req.query.type || 'document';
      const docServiceUrl = process.env.DOCUMENTS_SERVICE_URL || 'http://documents-service:4002';
      const response = await axios.get(`${docServiceUrl}/api/${docType}s/${req.params.documentId}`, {
        headers: { Authorization: req.headers.authorization }
      });
      const doc = response.data;
      if (doc.owner === req.userId) {
        return res.json({ permission: 'edit' });
      }
    } catch (e) {
      // игнорируем
    }
    return res.json({ permission: null });
  }
  res.json({ permission: share.permission });
});

module.exports = router;