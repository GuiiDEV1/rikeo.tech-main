const express = require('express');
const jwt = require('jsonwebtoken');
const Bookmark = require('../models/Bookmark');

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
 * POST /api/bookmarks
 * Bookmark a post (requires auth)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    const existingBookmark = await Bookmark.findOne({
      userId: req.userId,
      postId
    });

    if (existingBookmark) {
      return res.status(400).json({ error: 'Already bookmarked' });
    }

    const bookmark = new Bookmark({
      userId: req.userId,
      postId
    });

    await bookmark.save();

    res.status(201).json({
      success: true,
      message: 'Post bookmarked',
      bookmark
    });
  } catch (error) {
    console.error('Bookmark error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/bookmarks
 * Get user's bookmarked posts (requires auth)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const bookmarks = await Bookmark.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Bookmark.countDocuments({ userId: req.userId });

    res.json({
      success: true,
      bookmarks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/bookmarks/:postId
 * Remove a bookmark (requires auth)
 */
router.delete('/:postId', verifyToken, async (req, res) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      userId: req.userId,
      postId: req.params.postId
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({
      success: true,
      message: 'Bookmark removed'
    });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
