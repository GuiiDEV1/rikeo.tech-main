# Resend Integration - Quick Start (5 minutes)

## What's Done ✅
- Backend code updated with Resend integration
- Email templates created and configured
- Environment variables added
- Package dependency added
- Zero syntax errors
- **READY TO DEPLOY**

## 3-Step Setup

### Step 1: Create Resend Account (2 min)
1. Visit https://resend.com
2. Sign up for free account
3. Verify your email
4. Go to API Keys → Create Key
5. Copy the key (starts with `re_`)

### Step 2: Configure Backend (2 min)
```bash
# In backend/.env, add your key:
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=noreply@rikeo.tech

# Install packages:
cd backend
npm install
```

### Step 3: Test It (1 min)
```bash
# Start backend
npm run dev

# In frontend, register a new account
# Check your email for verification code
# Done!
```

## Test Without API Key

Don't want to set up Resend yet? 

1. Leave `RESEND_API_KEY` empty
2. Run `npm run dev`
3. Watch console for codes: `[DEV MODE] Verification code for user@email.com: 539821`
4. Copy code and verify in frontend

## Email Flows Working

✅ **Registration** - Sends verification code via email (or logs to console)
✅ **Verify Email** - User verifies code
✅ **Resend Code** - User can request new verification code
✅ **Password Reset** - Sends reset token via email (or logs to console)
✅ **Reset Password** - User resets password with token

## Files Changed

- `backend/routes/auth.js` - Added email functions
- `backend/package.json` - Added resend package
- `backend/.env` - Added config variables
- `backend/.env.example` - Updated template

## Common Issues

| Issue | Solution |
|-------|----------|
| Emails not sending | Add API key to `.env` |
| Don't see codes | Check terminal for `[DEV MODE]` messages |
| Email in spam | Add to contacts or check Resend domain config |
| "npm not found" | Run `npm install` in backend directory first |

## Full Documentation

Read [RESEND_SETUP.md](RESEND_SETUP.md) for:
- Detailed setup instructions
- Custom domain configuration
- Troubleshooting
- Security best practices
- Production deployment checklist

---

**That's it!** Your email service is ready to go.
