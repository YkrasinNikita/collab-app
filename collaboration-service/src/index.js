const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const shareRoutes = require('./routes/shares');
const commentRoutes = require('./routes/comments');
const invitationRoutes = require('./routes/invitations');
const internalRoutes = require('./routes/internal');
const logger = require('./logger');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/shares', shareRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/internal', internalRoutes);

const PORT = process.env.PORT || 4003;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB (collaboration)');
    server.listen(PORT, () => logger.info(`Collaboration service on port ${PORT}`));
    setupSocket(io);
  })
  .catch(err => logger.fatal(err));