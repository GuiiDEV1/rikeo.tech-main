require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Error handler wrapper
const asyncHandler = fn => (req, res, next) => {
  try {
    Promise.resolve(fn(req, res, next)).catch(next);
  } catch (err) {
    next(err);
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'RIKEO.TECH backend is running',
    timestamp: new Date().toISOString()
  });
});

// Try to load routes
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✓ Auth routes loaded');
} catch (err) {
  console.error('⚠ Auth routes failed to load:', err.message);
}

try {
  const bookmarkRoutes = require('./routes/bookmarks');
  app.use('/api/bookmarks', bookmarkRoutes);
  console.log('✓ Bookmarks routes loaded');
} catch (err) {
  console.error('⚠ Bookmarks routes failed to load:', err.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✓ Users routes loaded');
} catch (err) {
  console.error('⚠ Users routes failed to load:', err.message);
}

try {
  const messageRoutes = require('./routes/messages');
  app.use('/api/messages', messageRoutes);
  console.log('✓ Messages routes loaded');
} catch (err) {
  console.error('⚠ Messages routes failed to load:', err.message);
}

try {
  const notificationRoutes = require('./routes/notifications');
  app.use('/api/notifications', notificationRoutes);
  console.log('✓ Notifications routes loaded');
} catch (err) {
  console.error('⚠ Notifications routes failed to load:', err.message);
}

try {
  const moderationRoutes = require('./routes/moderation');
  app.use('/api/moderation', moderationRoutes);
  console.log('✓ Moderation routes loaded');
} catch (err) {
  console.error('⚠ Moderation routes failed to load:', err.message);
}

// Serve static frontend files
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ Server running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health\n`);
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
