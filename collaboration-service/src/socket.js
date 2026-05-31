module.exports.setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_document', (documentId) => {
      socket.join(documentId);
      console.log(`${socket.id} joined room ${documentId}`);
    });

    socket.on('leave_document', (documentId) => {
      socket.leave(documentId);
    });

    socket.on('content_updated', ({ documentId, content, userId }) => {
      socket.to(documentId).emit('content_updated', { content, userId });
    });

    socket.on('title_updated', ({ documentId, title, userId }) => {
      socket.to(documentId).emit('title_updated', { title, userId });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};