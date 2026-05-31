const express = require('express');
const router = express.Router();

router.post('/document-deleted', (req, res) => {
  const { documentId } = req.body;
  if (!documentId) return res.status(400).json({ message: 'documentId обязателен' });
  req.io.to(documentId).emit('document_deleted', { documentId });
  res.json({ success: true });
});

module.exports = router;