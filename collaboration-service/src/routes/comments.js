const express = require('express');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const router = express.Router();
router.use(auth);

// Получить комментарии к документу
router.get('/:documentId', async (req, res) => {
  const comments = await Comment.find({ documentId: req.params.documentId }).sort('createdAt');
  res.json(comments);
});

// Добавить комментарий
router.post('/:documentId', async (req, res) => {
  try {
    const comment = new Comment({
      documentId: req.params.documentId,
      userId: req.userId,
      userName: req.body.userName || 'Anonymous',
      text: req.body.text,
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;