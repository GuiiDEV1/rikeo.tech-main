# RIKEO.TECH Backend Server

A Node.js backend for email verification, user authentication, and persistent data storage.

## What's Inside

```
backend/
├── server.js                 # Express server entry point
├── package.json              # Dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore file
├── models/
│   └── User.js               # MongoDB user schema
├── routes/
│   └── auth.js               # Authentication API endpoints
├── utils/
│   ├── emailService.js       # Email sending via Mailgun
│   └── validators.js         # Validation helpers
├── SETUP.md                  # Detailed setup instructions
└── README.md                 # This file
```

## Quick Start (30 seconds)

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your Mailgun API key

# 3. Start server
npm start
```

Server runs at `http://localhost:5000`

## Features

✅ User registration with email verification
✅ In-app email verification codes (6 digits, 10-min expiry)
✅ Secure password hashing with bcrypt
✅ JWT token-based authentication
✅ Rate limiting on auth attempts
✅ MongoDB persistent storage
✅ CORS enabled for frontend
✅ Completely free - no external service costs

## API Endpoints

### Auth Routes (`/api/auth`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/register` | Create new user account |
| POST | `/verify-email` | Verify email with code |
| POST | `/resend-verification` | Send new verification code |
| POST | `/login` | Login user (email + password) |
| POST | `/logout` | Logout user |

## Configuration

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/rikeo-tech

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=5000
FRONTEND_URL=http://localhost:8000
```

### Dependencies

- **express** - Web server framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT auth
- **dotenv** - Environment variables
- **cors** - Cross-origin requests

## Development

### Run with auto-reload

```bash
npm run dev
```

Requires `nodemon` (installed by default)

### Test an endpoint

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "displayName": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "passwordConfirm": "password123"
  }'
```

## Connecting to Frontend

The frontend (`js/authService.js`) communicates with these endpoints:

```javascript
// Get current API base
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Example: Register
await AuthService.register(username, displayName, email, password, passwordConfirm);

// Example: Verify email
await AuthService.verifyEmail(email, code);

// Example: Login
await AuthService.login(email, password);
```

## Security

⚠️ **Important Notes:**

- Never commit `.env` file to Git
- Passwords are hashed with bcrypt (10 salt rounds)
- Email verification codes expire after 10 minutes
- Rate limiting prevents brute force attacks
- CORS configured to allow frontend only
- JWT tokens valid for 30 days

## Production Deployment

Before deploying:

1. ✅ Change `JWT_SECRET` to random string
2. ✅ Use production MongoDB (MongoDB Atlas)
3. ✅ Set `FRONTEND_URL` to your domain
4. ✅ Enable HTTPS on all endpoints
5. ✅ Add environment monitoring
6. ✅ Set up database backups

## Troubleshooting

**Server won't start:**
- Check if port 5000 is in use: `lsof -i :5000`
- Verify MongoDB is running
- Check .env file is properly formatted

**CORS errors:**
- Make sure `FRONTEND_URL` matches frontend address
- Check backend CORS headers in server.js

## Support

For detailed setup instructions, see [SETUP.md](./SETUP.md)

For implementation guide, see [../IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md)
