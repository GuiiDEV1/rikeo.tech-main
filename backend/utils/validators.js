const crypto = require('crypto');

/**
 * SECURITY: Generate a cryptographically secure 6-character verification code
 */
function generateVerificationCode() {
  // Use crypto.randomBytes for cryptographic security instead of Math.random()
  const bytes = crypto.randomBytes(4);
  const code = bytes.toString('hex').substring(0, 6).toUpperCase();
  return code;
}

/**
 * Generate verification token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate email format (basic check)
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * SECURITY: Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a, b) {
  if (!a || !b) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch (err) {
    return false;
  }
}

/**
 * SECURITY: Sanitize user input to prevent NoSQL injection attacks
 * Rejects inputs that contain MongoDB operators ($, .)
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove leading/trailing whitespace
  let sanitized = input.trim();
  
  // Check for NoSQL injection patterns
  // Block common MongoDB operators: $, dot notation at start/end
  if (sanitized.startsWith('$') || sanitized.startsWith('.') || sanitized.endsWith('.')) {
    throw new Error('Invalid input format');
  }
  
  // Additional check: reject if contains suspicious patterns that might be operators
  if (/^\s*\{[\s\S]*\}\s*$/.test(sanitized) || /^\s*\[[\s\S]*\]\s*$/.test(sanitized)) {
    throw new Error('Invalid input format');
  }
  
  return sanitized;
}

/**
 * SECURITY: Validate and sanitize username
 */
function validateAndSanitizeUsername(username) {
  if (typeof username !== 'string') {
    throw new Error('Username must be a string');
  }
  
  const sanitized = sanitizeInput(username);
  
  // Username: 3-20 chars, alphanumeric + underscore only
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(sanitized)) {
    throw new Error('Username must be 3-20 characters, containing only letters, numbers, and underscores');
  }
  
  return sanitized;
}

/**
 * SECURITY: Validate and sanitize email
 */
function validateAndSanitizeEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }
  
  const sanitized = sanitizeInput(email).toLowerCase();
  
  // Email validation: basic format check
  if (!isValidEmail(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  // Additional check: max length 254 (RFC 5321)
  if (sanitized.length > 254) {
    throw new Error('Email is too long');
  }
  
  return sanitized;
}

/**
 * SECURITY: Validate and sanitize display name
 */
function validateAndSanitizeDisplayName(displayName) {
  if (typeof displayName !== 'string') {
    throw new Error('Display name must be a string');
  }
  
  const sanitized = sanitizeInput(displayName);
  
  // Length check
  if (sanitized.length < 2 || sanitized.length > 50) {
    throw new Error('Display name must be 2-50 characters');
  }
  
  return sanitized;
}

module.exports = {
  generateVerificationCode,
  generateVerificationToken,
  isValidEmail,
  constantTimeCompare,
  sanitizeInput,
  validateAndSanitizeUsername,
  validateAndSanitizeEmail,
  validateAndSanitizeDisplayName
};
