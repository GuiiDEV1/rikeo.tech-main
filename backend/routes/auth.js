const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { generateVerificationCode, isValidEmail, constantTimeCompare, sanitizeInput, validateAndSanitizeUsername, validateAndSanitizeEmail, validateAndSanitizeDisplayName } = require('../utils/validators');
const { Resend } = require('resend');

const router = express.Router();

// Initialize Resend with API key (optional - will be null if not provided)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@rikeo.tech';

// Temporary in-memory cache for users during dev mode (with expiration)
const tempUserCache = {};
const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes - cache entries expire

// Cleanup function for expired cache entries
function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, user] of Object.entries(tempUserCache)) {
    if (user._createdAt && now - user._createdAt > CACHE_EXPIRATION_MS) {
      delete tempUserCache[key];
      console.log('Cleaned up expired cache entry:', key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCache, 5 * 60 * 1000);

// SECURITY: Rate limiting tracker
const rateLimitMap = {};
const RATE_LIMITS = {
  login: { attempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  register: { attempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  verify: { attempts: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
};

// SECURITY: Helper function for constant-time string comparison
function secureCompare(a, b) {
  if (!a || !b) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch (err) {
    return false;
  }
}

// SECURITY: Rate limiting middleware
function checkRateLimit(identifier, limitType) {
  return (req, res, next) => {
    const key = `${limitType}:${identifier(req)}`;
    const now = Date.now();
    
    if (!rateLimitMap[key]) {
      rateLimitMap[key] = [];
    }
    
    const limit = RATE_LIMITS[limitType];
    rateLimitMap[key] = rateLimitMap[key].filter(t => now - t < limit.windowMs);
    
    if (rateLimitMap[key].length >= limit.attempts) {
      return res.status(429).json({ 
        error: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil(limit.windowMs / 1000)
      });
    }
    
    rateLimitMap[key].push(now);
    next();
  };
}

// SECURITY: Hash password for dev mode with strong salt
async function hashPasswordDev(password) {
  try {
    return await bcrypt.hash(password, 12);
  } catch (err) {
    console.error('Password hashing error:', err);
    throw err;
  }
}

// SECURITY: Compare password for dev mode
async function comparePasswordDev(plainPassword, hashedPassword) {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (err) {
    console.error('Password comparison error:', err);
    return false;
  }
}

// SECURITY: Validate username format
function isValidUsername(username) {
  // 3-20 chars, alphanumeric + underscore, no special chars
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

/**
 * Helper function to send verification email (SINGLE SEND ONLY)
 */
async function sendVerificationEmail(userEmail, displayName, verificationCode) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[DEV MODE] Verification code for ${userEmail}: ${verificationCode}`);
      return true;
    }
    
    // SECURITY: Ensure email is only sent once per call
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: 'Verify Your RIKEO Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to RIKEO, ${displayName}!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">Your verification code is:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333;">${verificationCode}</p>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false; // Non-blocking - registration proceeds even if email fails
  }
}

/**
 * Helper function to send password reset email
 */
async function sendPasswordResetEmail(userEmail, displayName, resetToken) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[DEV MODE] Password reset token for ${userEmail}: ${resetToken}`);
      return true; // In dev mode without API key, just log
    }
    
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: 'Reset Your RIKEO Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${displayName},</p>
          <p>We received a request to reset your RIKEO password.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">Your reset code is:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333;">${resetToken}</p>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 1 hour.</p>
          <p style="color: #d9534f; margin-top: 20px;"><strong>Important:</strong> If you didn't request this reset, please ignore this email or change your password immediately.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">For security, never share this code with anyone.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false; // Non-blocking
  }
}

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
 * POST /api/auth/register
 * Register a new user and send verification email
 */
router.post('/register', checkRateLimit(req => req.ip || req.connection.remoteAddress, 'register'), async (req, res) => {
  try {
    const { username, displayName, email, password, passwordConfirm } = req.body;

    // Validation
    if (!username || !displayName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // SECURITY: Validate and sanitize inputs
    let sanitizedUsername, sanitizedDisplayName, sanitizedEmail;
    try {
      sanitizedUsername = validateAndSanitizeUsername(username);
      sanitizedDisplayName = validateAndSanitizeDisplayName(displayName);
      sanitizedEmail = validateAndSanitizeEmail(email);
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // SECURITY: Increased password requirements (12 chars min + complexity)
    if (password.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    // SECURITY: Require password complexity
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumbers) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase letters, lowercase letters, and numbers' 
      });
    }

    // Try to check if user exists (with timeout for dev mode)
    let existingUser = null;
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      );
      const checkPromise = User.findOne({
        $or: [{ email: sanitizedEmail }, { username: sanitizedUsername }]
      });
      existingUser = await Promise.race([checkPromise, timeoutPromise]);
    } catch (dbError) {
      console.warn('Database unavailable, checking temp cache for duplicates');
      // Check temp cache for existing email or username
      for (const [cachedEmail, cachedUser] of Object.entries(tempUserCache)) {
        if (cachedUser.email.toLowerCase() === sanitizedEmail.toLowerCase() || 
            cachedUser.username.toLowerCase() === sanitizedUsername.toLowerCase()) {
          existingUser = cachedUser; // Found duplicate in cache
          break;
        }
      }
    }

    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Generate avatar from initials
    const initials = sanitizedDisplayName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // SECURITY: Hash password before storing
    let hashedPassword = password;
    try {
      hashedPassword = await hashPasswordDev(password);
    } catch (err) {
      console.error('Password hashing failed:', err);
      return res.status(500).json({ error: 'Server error during registration' });
    }

    // Try to save user to database (with timeout)
    let user = null;
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      );
      const savePromise = User.create({
        username: sanitizedUsername,
        displayName: sanitizedDisplayName,
        email: sanitizedEmail,
        password: hashedPassword,
        avatar: initials,
        emailVerificationToken: verificationCode,
        emailVerificationExpires: verificationExpires,
        isEmailVerified: false
      });
      user = await Promise.race([savePromise, timeoutPromise]);
    } catch (dbError) {
      console.warn('Database unavailable, creating test user object');
      // Create in-memory user object for testing
      user = {
        _id: 'test_' + Date.now(),
        username: sanitizedUsername,
        displayName: sanitizedDisplayName,
        email: sanitizedEmail,
        password: hashedPassword,
        avatar: initials,
        emailVerificationToken: verificationCode,
        emailVerificationExpires: verificationExpires,
        isEmailVerified: false,
        role: 'member', // SECURITY: No auto-promotion to admin
        _createdAt: Date.now() // Track creation time for cache cleanup
      };
      // Cache this user for login/verify operations
      tempUserCache[sanitizedEmail.toLowerCase()] = user;
    }

    // Send verification email (this works without DB)
    await sendVerificationEmail(sanitizedEmail, sanitizedDisplayName, verificationCode);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email for a verification code.',
      userId: user._id
      // NOTE: verificationCode intentionally excluded from response
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with code
 */
router.post('/verify-email', checkRateLimit(req => req.body.email || req.ip || req.connection.remoteAddress, 'verify'), async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // SECURITY: Validate and sanitize email input
    let sanitizedEmail;
    try {
      sanitizedEmail = validateAndSanitizeEmail(email);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // Validate code format (should be alphanumeric)
    if (!/^[A-F0-9]{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid verification code format' });
    }

    let user = null;
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      );
      const checkPromise = User.findOne({ email: sanitizedEmail });
      user = await Promise.race([checkPromise, timeoutPromise]);
    } catch (dbError) {
      console.warn('Database unavailable, checking temp user cache');
      // In dev mode, check if user was created during registration
      user = tempUserCache[sanitizedEmail.toLowerCase()];
      
      if (!user) {
        return res.status(404).json({ error: 'User not found. Please register first.' });
      }

      // SECURITY: Use constant-time comparison for verification code
      if (new Date() > user.emailVerificationExpires) {
        return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      }

      const codeMatch = secureCompare(code, user.emailVerificationToken);
      if (!codeMatch) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }
      user.isEmailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;

      // Generate JWT token for automatic login
      const token = jwt.sign(
        { userId: user._id, email: user.email, username: user.username, role: user.role || 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        message: 'Email verified successfully! Logging you in...',
        token,
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio || '',
          role: user.role || 'user',
          joined: user.joined || new Date()
        }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // SECURITY: Use constant-time comparison for verification code
    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const codeMatch = secureCompare(code, user.emailVerificationToken);
    if (!codeMatch) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Generate JWT token for automatic login
    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully! Logging you in...',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        joined: user.joined
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error during email verification' });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification code
 */
router.post('/resend-verification', checkRateLimit(req => req.body.email || req.ip || req.connection.remoteAddress, 'verify'), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // SECURITY: Validate and sanitize email
    let sanitizedEmail;
    try {
      sanitizedEmail = validateAndSanitizeEmail(email);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // Try to find user with timeout (with 2 second timeout)
    let user = null;
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      );
      const checkPromise = User.findOne({ email: sanitizedEmail });
      user = await Promise.race([checkPromise, timeoutPromise]);
    } catch (dbError) {
      console.warn('Database unavailable, checking temp cache');
      // In dev mode without DB, check temp cache
      user = tempUserCache[sanitizedEmail];
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Try to save to database (with timeout)
    if (user._id && user.save) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB timeout')), 2000)
        );
        user.emailVerificationToken = verificationCode;
        user.emailVerificationExpires = verificationExpires;
        const savePromise = user.save();
        await Promise.race([savePromise, timeoutPromise]);
      } catch (dbError) {
        console.warn('Database save failed, updating cache only');
        // Update cache entry
        if (tempUserCache[sanitizedEmail]) {
          tempUserCache[sanitizedEmail].emailVerificationToken = verificationCode;
          tempUserCache[sanitizedEmail].emailVerificationExpires = verificationExpires;
        }
      }
    } else if (tempUserCache[sanitizedEmail]) {
      // Update cache for dev mode
      tempUserCache[sanitizedEmail].emailVerificationToken = verificationCode;
      tempUserCache[sanitizedEmail].emailVerificationExpires = verificationExpires;
    }

    // Send verification email - SINGLE SEND ONLY
    const emailSent = await sendVerificationEmail(sanitizedEmail, user.displayName || 'User', verificationCode);

    res.json({
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.'
      // NOTE: verificationCode intentionally excluded from response
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * Login user by email or username (only if email is verified)
 */
router.post('/login', checkRateLimit(req => req.body.email || req.ip || req.connection.remoteAddress, 'login'), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // SECURITY: Validate and sanitize email input
    let emailLower;
    try {
      emailLower = validateAndSanitizeEmail(email);
    } catch (err) {
      // If email validation fails, still try as username
      emailLower = email.toLowerCase().trim();
    }

    // First check temp cache (for dev mode)
    let user = null;
    for (const [cachedEmail, cachedUser] of Object.entries(tempUserCache)) {
      if (cachedUser.email.toLowerCase() === emailLower || 
          (cachedUser.username && cachedUser.username.toLowerCase() === emailLower)) {
        user = cachedUser;
        console.log('Found user in temp cache:', emailLower);
        break;
      }
    }
    
    if (user) {
      // SECURITY: Use bcrypt comparison for password validation
      let passwordMatch = false;
      try {
        passwordMatch = await comparePasswordDev(password, user.password);
      } catch (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Server error' });
      }
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email/username or password' });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          error: 'Please verify your email before logging in. Check your inbox for a verification code.',
          requiresEmailVerification: true,
          userId: user._id
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email, username: user.username, role: user.role || 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio || '',
          role: user.role || 'user',
          joined: user.joined || new Date()
        }
      });
    }

    // User not in cache, try database with timeout
    console.log('User not in temp cache, trying database for:', emailLower);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      );
      const queryPromise = User.findOne({
        $or: [
          { email: emailLower },
          { username: emailLower }
        ]
      });
      user = await Promise.race([queryPromise, timeoutPromise]);
    } catch (dbError) {
      console.warn('Database unavailable during login, user not in cache either');
      // Return helpful error message
      return res.status(400).json({ 
        error: 'Please register first if this is your first time. Or if you\'ve already registered, verify your email to log in.',
        requiresRegistration: true
      });
    }

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    // Password validation
    let passwordMatch = false;
    if (user.comparePassword) {
      // DB user - use bcrypt comparison (async method)
      passwordMatch = await user.comparePassword(password);
    } else {
      // Dev mode user - also use bcrypt comparison for security
      try {
        passwordMatch = await comparePasswordDev(password, user.password);
      } catch (err) {
        console.error('Dev mode password comparison error:', err);
        passwordMatch = false;
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email/username or password' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        error: 'Please verify your email before logging in. Check your inbox for a verification code.',
        requiresEmailVerification: true,
        userId: user._id
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio || '',
        role: user.role || 'user',
        joined: user.joined || new Date()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side should clear token)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please clear your local token.'
  });
});

/**
 * POST /api/auth/forgot-password
 * Generate password reset token
 */
router.post('/forgot-password', checkRateLimit(req => req.body.email || req.ip || req.connection.remoteAddress, 'verify'), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // SECURITY: Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      // SECURITY: Don't reveal if email exists or not (prevent user enumeration)
      return res.json({
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link. Check your inbox.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetTokenHash; // SECURITY: Store hashed token
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(sanitizedEmail, user.displayName, resetToken);

    res.json({
      success: true,
      message: 'If an account exists with that email, you will receive a password reset link. Check your inbox.'
      // NOTE: resetToken intentionally excluded from response
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error during password reset request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, token, and new password are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    // SECURITY: Require password complexity
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    
    if (!hasUppercase || !hasLowercase || !hasNumbers) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, and numbers' 
      });
    }

    // SECURITY: Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify token expiration
    if (new Date() > user.passwordResetExpires) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // SECURITY: Hash the provided token and compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenMatch = secureCompare(tokenHash, user.passwordResetToken);
    if (!tokenMatch) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

/**
 * POST /api/auth/upload-avatar
 * Upload custom avatar image (requires JWT auth)
 */
router.post('/upload-avatar', verifyToken, async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // SECURITY: Validate Base64 format and size (max 1MB, reduced from 2MB)
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Must be a valid image.' });
    }

    const base64Data = imageData.split(',')[1];
    const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
    const maxSizeInBytes = 1 * 1024 * 1024; // 1MB

    if (sizeInBytes > maxSizeInBytes) {
      return res.status(400).json({ error: 'Image is too large. Maximum size is 1MB.' });
    }

    // SECURITY: Validate image type (exclude SVG to prevent XSS)
    const validTypes = ['data:image/jpeg', 'data:image/png', 'data:image/gif', 'data:image/webp'];
    const hasValidType = validTypes.some(type => imageData.startsWith(type));

    if (!hasValidType) {
      return res.status(400).json({ error: 'Invalid image format. Only JPEG, PNG, GIF, and WebP are supported. SVG not allowed.' });
    }

    // SECURITY: Prevent SVG injection
    if (imageData.includes('data:image/svg') || imageData.includes('<svg')) {
      return res.status(400).json({ error: 'SVG images are not allowed for security reasons.' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: imageData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        joined: user.joined
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Server error during avatar upload' });
  }
});

/**
 * POST /api/auth/delete-account
 * Delete user account (requires password verification)
 */
router.post('/delete-account', verifyToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.userId;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // First try to find user in temp cache
    let user = null;
    for (const [email, cachedUser] of Object.entries(tempUserCache)) {
      if (cachedUser._id === userId) {
        user = cachedUser;
        break;
      }
    }

    // Verify password
    let passwordMatch = false;
    if (user) {
      // Dev mode user - use bcrypt comparison for security
      try {
        passwordMatch = await comparePasswordDev(password, user.password);
      } catch (err) {
        return res.status(500).json({ error: 'Server error' });
      }
    } else {
      // Try database
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB timeout')), 2000)
        );
        const queryPromise = User.findById(userId);
        user = await Promise.race([queryPromise, timeoutPromise]);
        
        if (user) {
          passwordMatch = await user.comparePassword(password);
        }
      } catch (dbError) {
        console.warn('Database unavailable during deletion');
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password. Account not deleted.' });
    }

    // Delete from temp cache
    for (const [email, cachedUser] of Object.entries(tempUserCache)) {
      if (cachedUser._id === userId) {
        delete tempUserCache[email];
        break;
      }
    }

    // Try to delete from database
    if (user && user.deleteOne) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB timeout')), 2000)
        );
        const deletePromise = User.findByIdAndDelete(userId);
        await Promise.race([deletePromise, timeoutPromise]);
      } catch (dbError) {
        console.warn('Database delete failed, but cache cleared');
      }
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Server error during account deletion' });
  }
});

module.exports = router;
