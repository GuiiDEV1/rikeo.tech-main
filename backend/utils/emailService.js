/**
 * Email Service - DEPRECATED/UNUSED
 * 
 * SECURITY NOTE: This file is no longer used. Email functionality has been moved to:
 * - backend/routes/auth.js - sendVerificationEmail() and sendPasswordResetEmail()
 * - Uses Resend API instead of Mailgun
 * 
 * This file is kept for reference only and should be deleted in production.
 * All email sending functions are now in auth.js for better security isolation.
 */

// This file is deprecated - do not use
console.warn('[DEPRECATED] emailService.js is deprecated. Email functions have moved to auth.js');

module.exports = {
  sendVerificationEmail: () => { throw new Error('Use auth.js sendVerificationEmail instead'); },
  sendPasswordResetEmail: () => { throw new Error('Use auth.js sendPasswordResetEmail instead'); }
};
