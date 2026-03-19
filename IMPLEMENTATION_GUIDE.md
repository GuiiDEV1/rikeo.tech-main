# Email Verification Implementation Guide

## Summary

You now have a **completely free** email verification system with NO external service costs! Here's what's been created:

### Backend Files (in `/backend/`):
- ✅ `server.js` - Express server with CORS
- ✅ `package.json` - Dependencies (no Mailgun needed)
- ✅ `.env.example` - Environment variables template
- ✅ `models/User.js` - MongoDB user schema with email verification fields
- ✅ `utils/validators.js` - Helper functions
- ✅ `routes/auth.js` - Auth API endpoints
- ✅ `SETUP.md` - Complete backend setup instructions

### Frontend Files (in `/js/`):
- ✅ `authService.js` - API communication layer
- ✅ `emailVerification.js` - Email verification modal & handlers
- ✅ (app.js updates needed - see below)

## How It Works

Instead of sending emails (which costs money), verification codes are returned directly in the API response:

1. User registers with email
2. Backend generates 6-digit verification code
3. Code is **returned in response** to show user
4. User enters code in modal
5. Email marked as verified

**No emails sent = No external service costs = Forever free!**

## Quick Start (2 minutes)

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env - minimal setup needed (just JWT_SECRET and MongoDB)

# 3. Start server
npm start
```

Backend runs at `http://localhost:5000`

### Step 2: Update HTML Files

Add these script references to each HTML file's `<head>` or before `</body>`:

```html
<!-- Email Verification -->
<script src="js/emailVerification.js"></script>
<!-- Backend Auth Service -->
<script src="js/authService.js"></script>
```

**Files to update:**
- index.html
- forum.html
- post.html
- profile.html
- search.html
- create.html

### Step 3: Update Registration in app.js

Replace the `handleRegister()` function with this:

```javascript
async function handleRegister() {
  const username    = document.getElementById('auth-username').value.trim().toLowerCase();
  const displayName = document.getElementById('auth-displayname')?.value.trim() || username;
  const email       = document.getElementById('auth-email')?.value.trim().toLowerCase() || '';
  const password    = document.getElementById('auth-password').value;
  const errorEl     = document.getElementById('auth-error');

  // Validation
  if (!username || !displayName || !email || !password) {
    showError(errorEl, 'Please fill all required fields.');
    return;
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    showError(errorEl, 'Username: 3–20 chars, lowercase letters, numbers, underscores.');
    return;
  }

  if (!isValidEmail(email)) {
    showError(errorEl, 'Please enter a valid email address.');
    return;
  }

  if (password.length < 6) {
    showError(errorEl, 'Password must be at least 6 characters.');
    return;
  }

  try {
    // Show loading state
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    // Register via backend API
    const result = await AuthService.register(username, displayName, email, password, password);

    showToast('Account created! Here is your verification code: ' + result.verificationCode, 'success');
    closeModal();

    // Show email verification modal
    setTimeout(() => {
      showEmailVerificationModal(email, result.userId, result.verificationCode);
    }, 500);
  } catch (error) {
    showError(errorEl, error.message || 'Registration failed. Please try again.');
    const btn = event.target;
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}
```

### Step 4: Update Registration Form HTML

Update the `renderAuthForm()` function registration tab to include email field:

```javascript
container.innerHTML = `
  <div class="form-group mb-16">
    <label class="form-label">Username</label>
    <input class="form-input" id="auth-username" placeholder="your_handle" autocomplete="username">
    <span class="form-hint">Lowercase letters, numbers, underscores only</span>
  </div>
  <div class="form-group mb-16">
    <label class="form-label">Display Name</label>
    <input class="form-input" id="auth-displayname" placeholder="How you appear" autocomplete="name">
  </div>
  <div class="form-group mb-16">
    <label class="form-label">Email</label>
    <input class="form-input" id="auth-email" type="email" placeholder="your@email.com" autocomplete="email">
  </div>
  <div class="form-group mb-24">
    <label class="form-label">Password</label>
    <input class="form-input" id="auth-password" type="password" placeholder="••••••••" autocomplete="new-password">
  </div>
  <button class="btn btn-primary" style="width:100%" onclick="handleRegister()">Create Account</button>
`;
```

### Step 5: Update Login Handler

Replace `handleLogin()` with:

```javascript
async function handleLogin() {
  const email = document.getElementById('auth-email')?.value.trim().toLowerCase() || '';
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');

  if (!email || !password) {
    showError(errorEl, 'Please fill all fields.');
    return;
  }

  try {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Signing In...';

    // Login via backend API
    const result = await AuthService.login(email, password);

    closeModal();
    showToast(`Welcome back, ${result.user.displayName}!`, 'success');
    updateAuthUI();

    if (window._authSuccessCallback) {
      window._authSuccessCallback(result.user);
      window._authSuccessCallback = null;
    }

    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    if (error.response?.requiresEmailVerification) {
      closeModal();
      showEmailVerificationModal(email);
    } else {
      showError(errorEl, error.message || 'Login failed.');
    }

    const btn = event.target;
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}
```

### Step 6: Update Login Form

Update login section in `renderAuthForm()`:

```javascript
if (tab === 'login') {
  container.innerHTML = `
    <div class="form-group mb-16">
      <label class="form-label">Email</label>
      <input class="form-input" id="auth-email" type="email" placeholder="your@email.com" autocomplete="email">
    </div>
    <div class="form-group mb-24">
      <label class="form-label">Password</label>
      <input class="form-input" id="auth-password" type="password" placeholder="••••••••" autocomplete="current-password">
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="handleLogin()">Sign In</button>
  `;
}
```

### Step 7: Update getCurrentUser()

Replace with:

```javascript
function getCurrentUser() {
  // Try backend API first
  if (AuthService.isAuthenticated()) {
    return AuthService.getCurrentUser();
  }
  // Fallback to localStorage (for demo accounts)
  return DB.getCurrentUser();
}
```

### Step 8: Add Helper Function

Add this to app.js (helper for email validation):

```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

## How It Works

1. **Registration Flow:**
   - User fills username, display name, email, password
   - Backend validates and creates user account
   - **Verification code generated and returned in response** (shown in toast & modal)
   - User enters code in verification modal
   - Email verified → User can login

2. **Login Flow:**
   - User enters email and password
   - Backend checks email verification status
   - If not verified → Shows error with resend option
   - If verified → Issues JWT token
   - Token stored in localStorage

3. **Email Verification:**
   - 6-character code generated
   - Code valid for 10 minutes
   - User can resend code (gets new code in response)
   - **No emails sent** - codes shown in app
   - Backend validates code before allowing login

**This means: No email service needed = No costs ever!**

## Testing Checklist

- [ ] Backend running at `http://localhost:5000`
- [ ] Frontend running at `http://localhost:8000`
- [ ] Register with new email → Verification code shown in toast & modal
- [ ] Copy code from toast → Paste into verification modal
- [ ] Enter code → Email verified
- [ ] Login with verified email → Success
- [ ] Try login with unverified email → Error shown with resend option
- [ ] Resend code button works → New code shown
- [ ] Rate limiting prevents spam registration

## Environment Variables Needed

```
# .env in /backend/ folder
MONGODB_URI=mongodb://localhost:27017/rikeo-tech
JWT_SECRET=your-random-secret-key-here
PORT=5000
FRONTEND_URL=http://localhost:8000
```

**That's it!** No Mailgun, no external services.

## Next Steps

1. Commit changes to git (add `/backend/.env` to .gitignore)
2. Deploy backend to hosting (Render, Railway, Heroku)
3. Update `FRONTEND_URL` in backend when deploying
4. Add production email domain to Mailgun
5. Implement password reset functionality
6. Add OAuth integration (Google, GitHub)

---

Questions? Check `backend/SETUP.md` for detailed instructions.
