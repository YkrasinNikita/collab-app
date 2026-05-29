const mongoose = require('mongoose');
const shareSchema = new mongoose.Schema({
  documentId: { type: String, required: true },   // ID заметки или карты
  documentType: { type: String, enum: ['document', 'mindmap'], required: true },
  ownerId: { type: String, required: true },       // ID владельца
  sharedWith: { type: String, required: true },    // ID пользователя, которому открыт доступ
  permission: { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
}, { timestamps: true });
shareSchema.index({ documentId: 1, sharedWith: 1 }, { unique: true });
module.exports = mongoose.model('Share', shareSchema);