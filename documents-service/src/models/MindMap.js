// documents-service/src/models/MindMap.js
const mongoose = require('mongoose');

const mindMapSchema = new mongoose.Schema({
  title: { type: String, required: true },
  nodes: { type: Array, default: [] },   // массив объектов { id, position, data: { label } }
  edges: { type: Array, default: [] },   // массив объектов { id, source, target }
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('MindMap', mindMapSchema);