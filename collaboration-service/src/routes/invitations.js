const express = require('express');
const auth = require('../middleware/auth');
const Invitation = require('../models/Invitation');
const Share = require('../models/Share');
const axios = require('axios');
const logger = require('../logger');
const router = express.Router();
router.use(auth);

const DOCS_URL = process.env.DOCUMENTS_SERVICE_URL || 'http://documents-service:4002';

router.post('/', async (req, res) => {
  try {
    const { documentId, documentType, toUser, permission } = req.body;
    if (!documentId || !documentType || !toUser) return res.status(400).json({ message: 'Missing fields' });
    const exist = await Invitation.findOne({ documentId, documentType, toUser, status: 'pending' });
    if (exist) return res.status(400).json({ message: 'Приглашение уже отправлено' });

    let docTitle = '';
    try {
      const docRes = await axios.get(`${DOCS_URL}/api/${documentType}s/${documentId}`, {
        headers: { Authorization: req.headers.authorization }
      });
      docTitle = docRes.data.title;
    } catch (e) {
      logger.error({ e }, 'Could not fetch document title');
    }

    const inv = new Invitation({ documentId, documentType, documentTitle: docTitle, fromUser: req.userId, toUser, permission });
    await inv.save();
    res.status(201).json(inv);
  } catch (err) {
    logger.error({ err }, 'Create invitation error');
    res.status(500).json({ message: err.message });
  }
});

router.get('/inbox', async (req, res) => {
  try {
    const invites = await Invitation.find({ toUser: req.userId, status: 'pending' }).sort('-createdAt');
    res.json(invites);
  } catch (err) {
    logger.error({ err }, 'Get inbox error');
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const inv = await Invitation.findOneAndUpdate(
      { _id: req.params.id, toUser: req.userId, status: 'pending' },
      { status },
      { new: true }
    );
    if (!inv) return res.status(404).json({ message: 'Not found' });
    if (status === 'accepted') {
      await new Share({
        documentId: inv.documentId,
        documentType: inv.documentType,
        ownerId: inv.fromUser,
        sharedWith: inv.toUser,
        permission: inv.permission,
      }).save();
    }
    res.json(inv);
  } catch (err) {
    logger.error({ err }, 'Update invitation error');
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;