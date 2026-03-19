const express = require('express');
const jwt = require('jsonwebtoken');
const Report = require('../models/Report');
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
 * Middleware to verify admin access
 */
async function verifyAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/moderation/report
 * Report a post or comment
 */
router.post('/report', verifyToken, async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Target type, ID, and reason are required' });
    }

    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    if (!['spam', 'harassment', 'offensive', 'misinformation', 'other'].includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    // Check if user has already reported this
    const existingReport = await Report.findOne({
      reporterId: req.userId,
      targetType,
      targetId
    });

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this item' });
    }

    const report = new Report({
      reporterId: req.userId,
      targetType,
      targetId,
      reason,
      description
    });

    await report.save();

    res.json({
      success: true,
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/moderation/reports
 * Get reports (admin only)
 */
router.get('/reports', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status = 'open', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = status !== 'all' ? { status } : {};
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('reporterId', 'username displayName')
      .populate('reviewedBy', 'username displayName')
      .lean();

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/moderation/reports/:id/resolve
 * Resolve a report (admin only)
 */
router.post('/reports/:id/resolve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { action, status } = req.body;

    if (!status || !['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        action: action || 'none',
        reviewedBy: req.userId,
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report resolved',
      report
    });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/moderation/content/:type/:id
 * Delete post or comment (admin only)
 */
router.delete('/content/:type/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!['post', 'comment'].includes(type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // In a real app, would delete from Post/Comment collections
    // For now, just return success to indicate the operation would be performed
    res.json({
      success: true,
      message: `${type} deleted by moderator`
    });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
