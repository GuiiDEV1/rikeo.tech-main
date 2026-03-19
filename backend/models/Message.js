const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for message threads (conversations between two users)
messageSchema.index(
  { senderId: 1, recipientId: 1, createdAt: -1 },
  { name: 'conversation_sender_index' }
);
messageSchema.index(
  { recipientId: 1, senderId: 1, createdAt: -1 },
  { name: 'conversation_recipient_index' }
);

// Auto-delete messages older than 90 days
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 }
);

module.exports = mongoose.model('Message', messageSchema);
