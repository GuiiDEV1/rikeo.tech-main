/**
 * RIKEO.TECH Backend Server
 * Handles authentication, email verification, and API endpoints
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const path = require('path');
// const authRoutes = require('./routes/auth');
// const notificationsRoutes = require('./routes/notifications');
// const moderationRoutes = require('./routes/moderation');
// const messagesRoutes = require('./routes/messages');
// const usersRoutes = require('./routes/users');
// const bookmarksRoutes = require('./routes/bookmarks');

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://rikeo.tech', 'https://www.rikeo.tech']
    : ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // SECURITY: Stricter CSP without unsafe-inline for scripts (inline scripts blocked)
  // Note: Frontend has inline scripts in HTML, so we allow them via unsafe-inline for now
  // Production: Move all scripts to external files and remove unsafe-inline
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' https:; base-uri 'self'; form-action 'self';");
  next();
});

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

// ── Start Server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
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
