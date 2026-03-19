/**
 * RIKEO.TECH Backend Server
 * Handles authentication, email verification, and API endpoints
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

console.log('Starting server...');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RIKEO.TECH backend is running' });
});

// ── Fallback ──────────────────────────────────────────────
app.all('*', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// ── Error Handling ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error caught:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
try {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   RIKEO.TECH Backend Server Running    ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}        ║
║   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:8000'} ║
╚════════════════════════════════════════╝
    `);
  });
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
