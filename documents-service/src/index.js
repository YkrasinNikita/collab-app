const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const documentRoutes = require('./routes/documents');
const mindmapRoutes = require('./routes/mindmaps');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/documents', documentRoutes);
app.use('/api/mindmaps', mindmapRoutes);

const PORT = process.env.PORT || 4002;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB (documents)');
    app.listen(PORT, () => console.log(`Documents service on port ${PORT}`));
  })
  .catch(err => console.error(err));