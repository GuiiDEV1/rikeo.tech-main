const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Unique constraint: one bookmark per user per post
bookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
