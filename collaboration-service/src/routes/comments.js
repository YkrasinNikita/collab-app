const express = require('express');
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const logger = require('../logger');
const router = express.Router();
router.use(auth);

router.get('/:documentId', async (req, res) => {
  try {
    const comments = await Comment.find({ documentId: req.params.documentId }).sort('createdAt');
    res.json(comments);
  } catch (err) {
    logger.error({ err }, 'Get comments error');
    res.status(500).json({ message: err.message });
  }
});

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
    logger.error({ err }, 'Add comment error');
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;