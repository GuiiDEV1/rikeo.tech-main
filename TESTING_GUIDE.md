# Testing Guide - Bug Fixes Verification

## How to Test Each Fixed Bug

### 🔴 CRITICAL BUGS

#### 1. Backend API URL Configuration
**Test Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to register or login
4. Check the API call URL
5. **Expected:** Should use relative URL in production, localhost:5000 in dev

**Verification:**
- [ ] API calls are made to correct endpoint
- [ ] Works in both development and production environments

---

#### 2. Password Reset Code Exposure
**Test Steps:**
1. Go to login page
2. Click "Forgot password?"
3. Enter an email address
4. Click "Send Reset Code"
5. **Expected:** Toast message says "Password reset code sent to your email. Check your inbox."
6. **NOT Expected:** Should NOT show the actual reset code

**Verification:**
- [ ] No code displayed in toast notification
- [ ] No code visible in Network tab response (check backend Config if needed)
- [ ] User can still reset password with code sent to email

---

#### 3. Email Verification Code Not Shown
**Test Steps:**
1. Create a new account
2. After registration, check the verification modal
3. **Expected:** Modal says "A verification code was sent to your email..."
4. **NOT Expected:** Should NOT display the verification code in large text

**Verification:**
- [ ] No verification code displayed in modal
- [ ] Input field present for user to enter code
- [ ] Can complete verification without seeing code

---

#### 4. Login Button Text Restored on Error
**Test Steps:**
1. Open login modal
2. Try to login with wrong password
3. **Expected:** Button text is restored to "Sign In" (not broken text)
4. Check that button is re-enabled

**Verification:**
- [ ] Button shows "Sign In" after error
- [ ] Button is clickable again
- [ ] No console errors

---

#### 5. Vote Counting Works (Up and Down)
**Test Steps:**
1. Navigate to a post with comments
2. Click upvote on a comment
3. **Expected:** Vote count increases by 1
4. Click upvote again
5. **Expected:** Vote count decreases by 1 (vote toggled off)
6. Click downvote
7. **Expected:** Vote count decreases by 2 (from 0 to -1)

**Verification:**
- [ ] Upvotes work correctly
- [ ] Downvotes work correctly
- [ ] Vote toggling works
- [ ] Vote switching works (up to down and vice versa)
- [ ] Vote counts display correctly

---

#### 6. XSS Protection in Images
**Test Steps:**
1. Create a post with content containing images
2. In the post content, try to include a data URL image:
   `<img src="data:image/png;base64,...">`
3. **Expected:** Image should NOT load
4. Try with a valid https:// image URL
5. **Expected:** Image should load normally

**Verification:**
- [ ] data: URLs are blocked
- [ ] http:// and https:// URLs work
- [ ] No XSS vulnerability via image src

---

### 🟠 HIGH SEVERITY BUGS

#### 7. Registration Verification Code Not Exposed
**Test Steps:**
1. Start registration flow
2. After account creation, check the toast message
3. **Expected:** Says "Account created successfully! Check your email to verify."
4. **NOT Expected:** Should NOT show verification code

**Verification:**
- [ ] No code in toast message
- [ ] Verification modal appears after toast closes
- [ ] Can enter code in modal to verify email

---

#### 8. Session Management Validates Expiration
**Test Steps:**
1. Login to the application
2. Check that you have an active session
3. Wait for 24 hours (or simulate with dev tools)
4. Refresh the page
5. **Expected:** Session should still work (within 24 hour window)
6. After 24 hours:
7. **Expected:** Auto-logout, must login again

**Verification:**
- [ ] Session persists within 24 hours
- [ ] Auto-logout after 24 hours
- [ ] getCurrentUser() checks session validity

---

#### 9. Tag Validation
**Test Steps:**
1. Go to create post page
2. Try to add a single-character tag (e.g., "a")
3. **Expected:** Toast says "Tags must be 2-20 characters"
4. Try to add a tag longer than 20 chars
5. **Expected:** Toast says "Tags must be 2-20 characters"
6. Add a valid 2-20 char tag
7. **Expected:** Tag added successfully

**Verification:**
- [ ] Tags shorter than 2 chars rejected
- [ ] Tags longer than 20 chars rejected
- [ ] Valid tags accepted
- [ ] User gets feedback for invalid tags

---

#### 10. Video URL Validation
**Test Steps:**
1. Go to create post page
2. Try to add an invalid video URL (e.g., "not a video")
3. **Expected:** No preview shown
4. Try a non-YouTube video URL
5. **Expected:** No preview shown
6. Add a valid YouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
7. **Expected:** Video preview shows

**Verification:**
- [ ] Invalid URLs don't show preview
- [ ] Only YouTube URLs show preview
- [ ] iframe embeds with correct YouTube ID
- [ ] Video URL properly sanitized

---

#### 11. Form Race Condition Fixed
**Test Steps:**
1. Go to create post page
2. Fill in title, content, category
3. Add tags and/or images
4. Click "Publish Thread"
5. **Expected:** Redirect happens AFTER form is cleared
6. Check that form state is reset
7. **Expected:** No data remains from previous post

**Verification:**
- [ ] Form cleared before redirect
- [ ] uploadedImages array reset
- [ ] tags array reset
- [ ] No data bleeding between posts

---

#### 12. Enhanced Error Handling
**Test Steps:**
1. Go to create post page
2. Try to create a post with invalid data
3. **Expected:** Error message shown
4. Check browser DevTools Console
5. **Expected:** Error logged with details
6. Fix the error and resubmit
7. **Expected:** Button text restored properly

**Verification:**
- [ ] Error messages are specific and helpful
- [ ] Errors logged to console for debugging
- [ ] Button restored on error
- [ ] Can reattempt after error

---

## Test Checklist

### Security Tests
- [ ] No sensitive codes exposed in UI
- [ ] No XSS vulnerabilities in image handling  
- [ ] Video URLs properly validated
- [ ] Input validation working

### Functionality Tests
- [ ] Voting system works bidirectionally
- [ ] Form submission completes properly
- [ ] Session validation works correctly
- [ ] Tag validation enforced

### User Experience Tests
- [ ] Button states managed correctly
- [ ] Error messages are clear
- [ ] No console errors on normal operation
- [ ] All modal flows complete successfully

### Browser Compatibility Tests
- [ ] Chrome/Edge (Chromium-based)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## Quick Test Script

```javascript
// Run this in browser console to test fixes:

// Test 1: Check API_BASE configuration
console.log('API_BASE:', API_BASE);

// Test 2: Verify getCurrentUser includes session check
const user = getCurrentUser();
console.log('Current user:', user);

// Test 3: Test vote logic (requires mock comment)
// DB.getCommentVotes(commentId, userId, 'up');
// DB.getCommentVotes(commentId, userId, 'down');

// Test 4: Check sanitizeHTML blocks data: URLs
const testXSS = sanitizeHTML('<img src="data:image/png;base64,test" />');
console.log('XSS test result:', testXSS);

// Test 5: Verify tags validation
// Try adding invalid tags in create form
```

---

## Issues During Testing?

If you find any issues:

1. **Check Console:** Open DevTools → Console for any error messages
2. **Check Network:** Look at API requests to verify URLs and responses
3. **Check LocalStorage:** See if data is persisted correctly
4. **Clear Cache:** Ctrl+Shift+Delete to clear browser cache
5. **Verify Backend:** Ensure backend server is running if testing API routes

---

## Reporting Test Results

When testing, document:
- [ ] Browser and version tested
- [ ] Test date and time
- [ ] Any errors encountered
- [ ] Expected vs actual behavior
- [ ] Steps to reproduce any issues

---

**Last Updated:** March 19, 2026
**Status:** Ready for QA Testing
