const mongoose = require('mongoose');
const mindMapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  nodes: { type: mongoose.Schema.Types.Mixed, default: {} }, // JSON-дерево ментальной карты
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
module.exports = mongoose.model('MindMap', mindMapSchema);