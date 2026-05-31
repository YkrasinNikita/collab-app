const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const shareRoutes = require('./routes/shares');
const commentRoutes = require('./routes/comments');
const invitationRoutes = require('./routes/invitations');
const logger = require('./logger');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/shares', shareRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/invitations', invitationRoutes);

const PORT = process.env.PORT || 4003;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB (collaboration)');
    app.listen(PORT, () => logger.info(`Collaboration service on port ${PORT}`));
  })
  .catch(err => logger.fatal(err));