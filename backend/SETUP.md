# RIKEO.TECH Backend Setup Guide

## Overview

This backend enables email verification, persistent user storage, and secure authentication for RIKEO.TECH forum.

## What's Included

- **Express.js** server with REST API endpoints
- **MongoDB** for user data persistence
- **Nodemailer** + **Mailgun** for email verification
- **JWT** tokens for session management
- **Bcrypt** for password hashing
- Email verification workflow with 10-minute expiring codes

## Prerequisites

- **Node.js 14+** (check with `node --version`)
- **MongoDB** (local or cloud via MongoDB Atlas)
- **Frontend running** on `http://localhost:8000`

## Installation Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

Edit `.env`:

```
# MongoDB URI (local or cloud)
MONGODB_URI=mongodb://localhost:27017/rikeo-tech

# Generate a random secret (use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-random-secret-key-here

# Ports
PORT=5000
FRONTEND_URL=http://localhost:8000
```

### 3. Set Up MongoDB

#### Option A: Local MongoDB (Mac/Linux)

```bash
# Install if needed
brew install mongodb-community
brew services start mongodb-community

# Verify it's running
mongo
```

#### Option B: MongoDB Atlas (Cloud - Recommended)

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free account
3. Create a cluster
4. Get connection string with username/password
5. Add to `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rikeo-tech?retryWrites=true&w=majority
   ```

### 4. Start the Backend Server

```bash
npm start

# Or with auto-reload during development:
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║   RIKEO.TECH Backend Server Running    ║
╠════════════════════════════════════════╣
║   Port: 5000                           ║
║   Environment: development             ║
║   Frontend: http://localhost:8000      ║
╚════════════════════════════════════════╝
```

## API Endpoints

### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "kai_dev",
  "displayName": "Kai",
  "email": "kai@example.com",
  "password": "securepassword123",
  "passwordConfirm": "securepassword123"
}

Response:
{
  "success": true,
  "message": "Registration successful. Your verification code is shown below. Enter it to complete registration.",
  "userId": "507f1f77bcf86cd799439011",
  "verificationCode": "A7B2C9"
}
```

### Verify Email
```
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "kai@example.com",
  "code": "A7B2C9"
}

Response:
{
  "success": true,
  "message": "Email verified successfully! You can now log in."
}
```

### Resend Verification Code
```
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "kai@example.com"
}

Response:
{
  "success": true,
  "message": "New verification code generated. Enter it below to complete email verification.",
  "verificationCode": "X9Y2Z5"
}
```

### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "kai@example.com",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "kai_dev",
    "displayName": "Kai",
    "email": "kai@example.com",
    "avatar": "KD",
    "role": "member",
    "joined": 1710777600000
  }
}
```

### Logout
```
POST /api/auth/logout

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

## Frontend Integration

### 1. Add Script References

In your HTML files (index.html, forum.html, etc.), add before closing `</body>`:

```html
<!-- Backend API Service -->
<script src="js/authService.js"></script>
<!-- Update app.js with new auth flow -->
<script src="js/app.js"></script>
```

### 2. Update Registration Flow

After registration, user sees email verification modal with:
- Email input (pre-filled)
- Code input field
- Timer showing code expiration
- "Resend Code" button
- Ability to go back and try different email

### 3. Update Login to Check Email Verification

Login endpoint now returns:
- Error `requiresEmailVerification: true` if email not verified
- Shows error message with option to resend code

## Testing

### Test Email Workflow

1. **Register** with test email (use real email or temp service like tempmail.com)
2. **Check email** for verification code
3. **Enter code** in modal
4. **Confirm** email verified message
5. **Login** with new account

### Test with Demo Accounts

During development, you can still use localStorage fallback:
- Username: `rikeo`
- Password: `rikeo_admin_2025`

## Troubleshooting

### "Cannot GET /api/auth/register"
- Backend server is not running
- Check if running on port 5000: `http://localhost:5000/api/health`
- Make sure CORS is enabled in server.js

### "Failed to connect to MongoDB"
- MongoDB not running (test with `mongo`)
- Wrong URI in `.env`
- Connection string expired (MongoDB Atlas)

## Next Steps

1. **Integrate with frontend** (see IMPLEMENTATION_GUIDE.md)
2. **Deploy MongoDB** to a production server
3. **Add user profile endpoints** (bio, avatar, etc.)
4. **Implement password reset** (optional - requires email service)
5. **Add OAuth** (Google, GitHub login) - optional

## Security Notes

⚠️ **Important for Production:**
- Never commit `.env` file to git
- Use environment variables on your hosting platform
- Add HTTPS to all requests
- Implement rate limiting on auth endpoints
- Add CAPTCHA to registration
- Use secure password requirements (already enforced)
- Monitor for abuse patterns
- Use strong JWT_SECRET (change from example)

---

For questions or issues, check the backend logs or test endpoints with **Postman** or **curl**.
