const express = require('express');
const jwt = require('jsonwebtoken');
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
 * GET /api/users/search
 * Search for users by username or display name
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // SECURITY: Escape special regex characters to prevent ReDoS attacks
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const users = await User.find({
      $or: [
        { username: { $regex: escapedQ, $options: 'i' } },
        { displayName: { $regex: escapedQ, $options: 'i' } }
      ]
    })
      .select('username displayName avatar bio followers')
      .limit(20)
      .lean();

    res.json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        bio: u.bio,
        followerCount: u.followers?.length || 0
      }))
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/users/:username
 * Get specific user profile
 */
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username displayName')
      .populate('following', 'username displayName')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        joined: user.joined,
        postCount: user.postCount,
        followers: user.followers || [],
        following: user.following || [],
        followerCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/users/:userId/follow
 * Follow a user (requires auth)
 */
router.post('/:userId/follow', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.userId === userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(userId);
    const currentUser = await User.findById(req.userId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add to following list
    if (!currentUser.following.includes(userId)) {
      currentUser.following.push(userId);
      await currentUser.save();
    }

    // Add to followers list
    if (!targetUser.followers.includes(req.userId)) {
      targetUser.followers.push(req.userId);
      await targetUser.save();
    }

    res.json({
      success: true,
      message: 'User followed successfully',
      followerCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/users/:userId/follow
 * Unfollow a user (requires auth)
 */
router.delete('/:userId/follow', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId);
    const currentUser = await User.findById(req.userId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from following list
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== userId
    );
    await currentUser.save();

    // Remove from followers list
    targetUser.followers = targetUser.followers.filter(
      id => id.toString() !== req.userId
    );
    await targetUser.save();

    res.json({
      success: true,
      message: 'User unfollowed successfully',
      followerCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

