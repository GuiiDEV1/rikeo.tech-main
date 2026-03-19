# Resend Email Service Integration Setup Guide

## Overview

RIKEO.TECH now uses **Resend** as the email service provider for sending verification codes and password reset links. Resend provides a modern, developer-friendly API with a free tier of 100 emails/day.

## Current Implementation Status

✅ **Completed:**
- Resend integration code added to `backend/routes/auth.js`
- Email templates implemented for verification and password reset
- Environment configuration updated
- Package dependency added to `package.json`
- Helper functions `sendVerificationEmail()` and `sendPasswordResetEmail()` created

## Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click **Sign Up** and create a free account
3. Verify your email address
4. Complete the account setup process

## Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys** section (usually in settings)
3. Click **Create API Key**
4. Copy the generated API key (starts with `re_`)
5. **IMPORTANT:** Store this key securely - never commit it to git

## Step 3: Configure Your Domain (Production)

For production deployment, you should configure a custom domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `rikeo.tech`)
4. Follow DNS configuration steps
5. Once verified, you can use emails from your domain

**For Development:** You can test with Resend's default domain or a temporary email.

## Step 4: Update Backend Configuration

### Install Dependencies

```bash
cd backend
npm install
```

This installs the `resend` package that's now in `package.json`.

### Configure Environment Variables

Open `backend/.env` and update these values:

```env
# Email Service - Resend
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=noreply@rikeo.tech
```

**Important Notes:**
- `RESEND_API_KEY`: Get this from Resend dashboard (Step 2)
- `RESEND_FROM_EMAIL`: Should match your verified domain in Resend
- Never commit `.env` file with real credentials to git
- Use `.env.example` as template (already updated with required fields)

## Step 5: Test Email Sending

### Development Mode (Without API Key)

If you don't set `RESEND_API_KEY` in `.env`, the system will:
- Log verification codes and reset tokens to console
- Show `[DEV MODE]` prefix
- Allow you to test the complete flow

Example console output:
```
[DEV MODE] Verification code for user@example.com: 123456
[DEV MODE] Password reset token for user@example.com: abc123def456
```

### Production Mode (With API Key)

Once you add the real API key, emails will actually be sent via Resend API.

### Manual Testing

1. Start your backend: `npm run dev`
2. Register a new account via the frontend
3. Check the backend console for the verification code (dev mode) or check email (production)
4. Complete email verification
5. Test password reset flow similarly

## Email Templates

The system sends two types of emails:

### 1. Email Verification Email

**When sent:** After user registration
**Contains:** 
- Welcome message with user's display name
- Verification code
- Code expiration info (10 minutes)
- Security notice

**Template location:** `backend/routes/auth.js` (lines ~20-40)

### 2. Password Reset Email

**When sent:** When user requests password reset via forgot-password
**Contains:**
- Password reset request confirmation
- Reset token/code
- Code expiration info (1 hour)
- Security warning about not sharing the code

**Template location:** `backend/routes/auth.js` (lines ~43-70)

## Code Changes Summary

### Modified Files

#### `backend/routes/auth.js`
- Added Resend import: `const { Resend } = require('resend')`
- Added `sendVerificationEmail()` function
- Added `sendPasswordResetEmail()` function
- Updated POST `/api/auth/register` endpoint
- Updated POST `/api/auth/resend-verification` endpoint
- Updated POST `/api/auth/forgot-password` endpoint

#### `backend/package.json`
- Added `"resend": "^0.16.0"` to dependencies

#### `backend/.env`
- Added `RESEND_API_KEY`
- Added `RESEND_FROM_EMAIL`

#### `backend/.env.example`
- Updated template with new email service variables

### Key Functions

```javascript
/**
 * Sends verification email with 6-digit code
 * @param {string} userEmail - Recipient email
 * @param {string} displayName - User's display name
 * @param {string} verificationCode - 6-digit verification code
 * @returns {Promise<boolean>} - Success status
 */
async function sendVerificationEmail(userEmail, displayName, verificationCode)

/**
 * Sends password reset email with reset token
 * @param {string} userEmail - Recipient email
 * @param {string} displayName - User's display name
 * @param {string} resetToken - 64-character reset token
 * @returns {Promise<boolean>} - Success status
 */
async function sendPasswordResetEmail(userEmail, displayName, resetToken)
```

## Error Handling

The email functions include graceful error handling:

```javascript
// In DEVELOPMENT MODE (no API key):
// - Logs to console for debugging
// - Returns true (doesn't fail registration/password reset)

// In PRODUCTION MODE (with API key):
// - Attempts to send via Resend API
// - If email fails:
//   - Logs error to console
//   - Returns false
//   - Does NOT block registration/password reset (non-blocking)
```

**Important:** If email service fails, the user can still complete registration/reset (non-blocking). This prevents email issues from breaking the auth flow.

## Deployment Checklist

Before deploying to production:

- [ ] Create Resend account
- [ ] Get API key from Resend dashboard
- [ ] Configure custom domain in Resend (optional but recommended)
- [ ] Update `RESEND_API_KEY` in production `.env`
- [ ] Update `RESEND_FROM_EMAIL` to match verified domain
- [ ] Run `npm install` to install dependencies
- [ ] Test registration flow end-to-end
- [ ] Test password reset flow end-to-end
- [ ] Verify emails are received (not in spam)
- [ ] Monitor Resend dashboard for email stats

## Troubleshooting

### Emails Not Sending

1. **Check API key:** Verify in Resend dashboard it's active and correct
2. **Check domain verification:** If using custom domain, ensure it's verified
3. **Check console logs:** Look for error messages with `[DEV MODE]` or error details
4. **Check spam folder:** Some emails might be marked as spam
5. **Monitor Resend dashboard:** Shows failed deliveries and bounce reasons

### Development Mode Issues

- If `RESEND_API_KEY` is not set, emails won't actually send
- Check backend console for `[DEV MODE]` messages
- This is intentional for development - allows testing without API key

### Email Not Verified

- Code expires in 10 minutes - user must verify quickly
- Resend verification endpoint can resend new code
- Check that user is using correct case-sensitive code

### Password Reset Not Working

- Token expires in 1 hour
- User can request new reset token
- Check that email matches registered account (case-insensitive)

## Security Notes

1. **API Key Security:**
   - Never commit `.env` file to git
   - Use `.env.example` as template
   - Rotate keys periodically in production

2. **Email Content:**
   - Verification codes and reset tokens are in email only
   - NOT returned in API responses (security best practice)
   - Console logging only in dev mode

3. **Rate Limiting:**
   - Consider rate limiting password reset requests
   - Free tier allows 100 emails/day - monitor usage
   - Scale rate limits based on user base

## Next Steps

1. **Immediate:** 
   - [ ] Install resend package: `cd backend && npm install`
   - [ ] Create Resend account and get API key
   - [ ] Add API key to .env

2. **Testing:**
   - [ ] Test registration with Resend email
   - [ ] Test password reset flow
   - [ ] Verify email templates look good

3. **Production:**
   - [ ] Configure custom domain in Resend
   - [ ] Update RESEND_FROM_EMAIL to use custom domain
   - [ ] Monitor Resend dashboard for email stats

## Support & Additional Resources

- **Resend Documentation:** https://resend.com/docs
- **API Reference:** https://resend.com/docs/api-reference/emails/send
- **Email Template Guide:** https://resend.com/docs

## Summary

The Resend integration is complete and ready to use. The system works in two modes:

1. **Development Mode** (no API key) - Logs codes to console
2. **Production Mode** (with API key) - Sends real emails

Simply add your Resend API key to `.env` and the system will automatically start sending emails. The implementation is robust with error handling and fallbacks.
