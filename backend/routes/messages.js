const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

const router = express.Router();

/**
 * Middleware to verify JWT token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * POST /api/messages/send
 * Send a direct message
 */
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ error: 'Recipient and content are required' });
    }

    if (req.userId === recipientId) {
      return res.status(400).json({ error: 'Cannot send messages to yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const message = new Message({
      senderId: req.userId,
      recipientId,
      content
    });

    await message.save();
    await message.populate('senderId', 'username displayName avatar');

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/messages/conversation/:otherUserId
 * Get messages in a conversation
 */
router.get('/conversation/:otherUserId', verifyToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { limit = 30, skip = 0 } = req.query;

    // Get messages between current user and other user
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: req.userId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('senderId', 'username displayName avatar')
      .lean();

    // Reverse to get chronological order
    const orderedMessages = messages.reverse();

    // Mark recipient's messages as read
    await Message.updateMany(
      {
        senderId: otherUserId,
        recipientId: req.userId,
        isRead: false
      },
      { isRead: true }
    );

    res.json({
      success: true,
      messages: orderedMessages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/messages/conversations
 * Get list of active conversations
 */
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    // Get all unique conversation partners
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: new (require('mongoose')).Types.ObjectId(req.userId) },
            { recipientId: new (require('mongoose')).Types.ObjectId(req.userId) }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', new (require('mongoose')).Types.ObjectId(req.userId)] },
              '$recipientId',
              '$senderId'
            ]
          },
          lastMessage: { $max: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipientId', new (require('mongoose')).Types.ObjectId(req.userId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { lastMessage: -1 }
      },
      {
        $skip: parseInt(skip)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      }
    ]);

    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        userId: conv._id,
        username: conv.user[0]?.username,
        displayName: conv.user[0]?.displayName,
        avatar: conv.user[0]?.avatar,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount
      }))
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/messages/unread-count
 * Get total unread message count
 */
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipientId: req.userId,
      isRead: false
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/messages/:id
 * Delete a message (sender only)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    await Message.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
