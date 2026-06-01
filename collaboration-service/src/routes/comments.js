const express = require('express');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const logger = require('../logger');
const router = express.Router();
router.use(auth);

// GET /:documentId – получить комментарии документа
router.get('/:documentId', async (req, res) => {
  try {
    const comments = await Comment.find({ documentId: req.params.documentId }).sort('createdAt');
    res.json(comments);
  } catch (err) {
    logger.error({ err }, 'Ошибка получения комментариев');
    res.status(500).json({ message: 'Ошибка при загрузке комментариев' });
  }
});

// POST /:documentId – добавить комментарий
router.post('/:documentId', async (req, res) => {
  try {
    const { text, userName } = req.body;
    const comment = new Comment({
      documentId: req.params.documentId,
      userId: req.userId,
      userName: userName || 'Аноним',
      text,
    });
    await comment.save();

    // Рассылаем комментарий всем в комнате
    req.io.to(req.params.documentId).emit('comment_added', {
      _id: comment._id,
      documentId: comment.documentId,
      userId: comment.userId,
      userName: comment.userName,
      text: comment.text,
      createdAt: comment.createdAt,
    });

    res.status(201).json(comment);
  } catch (err) {
    logger.error({ err }, 'Ошибка добавления комментария');
    res.status(500).json({ message: 'Ошибка при добавлении комментария' });
  }
});

module.exports = router;