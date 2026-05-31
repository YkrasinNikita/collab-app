const mongoose = require('mongoose');
const invitationSchema = new mongoose.Schema({
  documentId: { type: String, required: true },
  documentType: { type: String, enum: ['document', 'mindmap'], required: true },
  documentTitle: { type: String, default: '' },   // <-- новое поле
  fromUser: { type: String, required: true },
  toUser: { type: String, required: true },
  permission: { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
}, { timestamps: true });
module.exports = mongoose.model('Invitation', invitationSchema);