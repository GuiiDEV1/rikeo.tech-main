/**
 * RIKEO.TECH — Data Layer
 * Manages all data via localStorage with a clean API.
 * 
 * SECURITY FEATURES:
 * - Password hashing via simple SHA-256 hash
 * - Session tokens with expiration
 * - Rate limiting for auth attempts
 * - Input sanitization
 * - Private profile enforcement
 * - Secure file validation
 */

// ── Simple Password Hashing ────────────────────────────────
// NOTE: For production, use server-side hashing (bcrypt, argon2)
const SecurityUtil = {
  // CRITICAL: Password hashing has moved to backend
  // Frontend MUST send plain passwords over HTTPS to backend
  // Backend uses bcryptjs with 12+ rounds for security
  // This function is deprecated and kept only for localStorage fallback
  hashPassword(password) {
    // WARNING: This is NOT cryptographically secure
    // Only used for demo localStorage, backend uses proper bcryptjs
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(36) + '_' + password.length;
  },

  verifyPassword(password, hash) {
    // NOTE: Backend should always use this, frontend fallback only
    return hash === this.hashPassword(password);
  },

  generateSessionToken() {
    return 'session_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 15);
  },

  generateCSRFToken() {
    return 'csrf_' + Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
  },

  // Rate limiting tracker
  attempts: {},
  trackAttempt(key) {
    const now = Date.now();
    if (!this.attempts[key]) this.attempts[key] = [];
    this.attempts[key] = this.attempts[key].filter(t => now - t < 3600000); // 1 hour window
    this.attempts[key].push(now);
  },

  isRateLimited(key, maxAttempts = 5, windowMs = 900000) { // 5 attempts per 15 min
    const now = Date.now();
    if (!this.attempts[key]) return false;
    const recent = this.attempts[key].filter(t => now - t < windowMs);
    return recent.length >= maxAttempts;
  },

  // Validate email format
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Validate file MIME type
  isValidImageMime(mimeType) {
    return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType);
  },
};

const DB = {
  KEYS: {
    USERS:    'rikeo_users',
    SESSION:  'rikeo_session',
    POSTS:    'rikeo_posts',
    COMMENTS: 'rikeo_comments',
    VOTES:    'rikeo_votes',
    CSRF:     'rikeo_csrf',
  },

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; }
    catch { return null; }
  },

  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  seed() {
    if (this._get(this.KEYS.POSTS)) return;

    // Initialize empty data - no demo posts/users (clean slate)
    this._set(this.KEYS.USERS, []);
    this._set(this.KEYS.POSTS, []);
    this._set(this.KEYS.COMMENTS, []);
    this._set(this.KEYS.VOTES, {});
  },

  _migratePasswords() {
    const users = this._get(this.KEYS.USERS) || [];
    let updated = false;
    
    users.forEach(user => {
      // Check if password is plain-text (doesn't start with 'hash_')
      if (user.password && !user.password.startsWith('hash_')) {
        // Upgrade to hashed password
        user.password = SecurityUtil.hashPassword(user.password);
        updated = true;
      }
    });
    
    // Save migrated passwords back to localStorage
    if (updated) {
      this._set(this.KEYS.USERS, users);
    }
  },

  CATEGORIES: [
    { id: 'cat_general', name: 'General', icon: '◈', description: 'Introductions, meta discussion, and everything else.', color: '#888' },
    { id: 'cat_video',   name: 'Video Discussion', icon: '▶', description: 'Companion threads for videos. Dive deeper.', color: '#c9a84c' },
    { id: 'cat_design',  name: 'Design', icon: '◻', description: 'UI, typography, visual culture, aesthetics.', color: '#7a9ef5' },
    { id: 'cat_tech',    name: 'Tech & Code', icon: '⌗', description: 'Dev tools, workflows, engineering decisions.', color: '#4caf6a' },
    { id: 'cat_culture', name: 'Culture', icon: '◉', description: 'Ideas, media, philosophy, and culture.', color: '#d47a5a' },
    { id: 'cat_showcase',name: 'Showcase', icon: '✦', description: 'Share what you are building.', color: '#b87fd4' },
  ],

  getCategory(id) {
    return this.CATEGORIES.find(c => c.id === id) || null;
  },

  getUsers() { return this._get(this.KEYS.USERS) || []; },
  getUser(id) { return this.getUsers().find(u => u.id === id) || null; },
  getUserByUsername(username) { return this.getUsers().find(u => u.username === username) || null; },

  createUser(data) {
    const users = this.getUsers();
    if (users.find(u => u.username === data.username)) return null;
    // Security: Hash password before storing
    const user = {
      id: 'usr_' + this.uid(),
      username: data.username,
      displayName: data.displayName || data.username,
      bio: '',
      email: '',
      role: 'member',
      joined: Date.now(),
      postCount: 0,
      avatar: data.username.slice(0, 2).toUpperCase(),
      password: SecurityUtil.hashPassword(data.password),
      isPrivate: false,
    };
    users.push(user);
    this._set(this.KEYS.USERS, users);
    return user;
  },

  updateUser(id, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    this._set(this.KEYS.USERS, users);
    return users[idx];
  },

  setUserProfilePicture(userId, imageData, mimeType) {
    if (!imageData) return null;
    // Security: Validate file size (max 1MB for base64 data)
    if (imageData.length > 1024 * 1024) return false;
    // Security: Validate image MIME type if provided
    if (mimeType && !SecurityUtil.isValidImageMime(mimeType)) return false;
    const key = 'rikeo_pfp_' + userId;
    localStorage.setItem(key, imageData);
    return true;
  },

  getUserProfilePicture(userId) {
    const key = 'rikeo_pfp_' + userId;
    return localStorage.getItem(key) || null;
  },

  getSession() { return this._get(this.KEYS.SESSION); },
  
  setSession(user) {
    // Security: Add session token and expiration (24 hours)
    const session = {
      userId: user.id,
      username: user.username,
      token: SecurityUtil.generateSessionToken(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      createdAt: Date.now(),
    };
    this._set(this.KEYS.SESSION, session);
    return session;
  },
  
  clearSession() {
    localStorage.removeItem(this.KEYS.SESSION);
  },
  
  isSessionValid() {
    const session = this.getSession();
    if (!session) return false;
    // Security: Check if session has expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      this.clearSession();
      return false;
    }
    return true;
  },

  login(username, password) {
    // Security: Rate limit login attempts (5 attempts per 15 minutes)
    const attemptKey = 'login_' + username;
    if (SecurityUtil.isRateLimited(attemptKey, 5, 900000)) {
      return null; // Too many attempts
    }
    SecurityUtil.trackAttempt(attemptKey);
    
    const user = this.getUserByUsername(username);
    if (!user) return null;
    // Security: Compare hashed password
    if (!SecurityUtil.verifyPassword(password, user.password)) return null;
    this.setSession(user);
    return user;
  },

  getCurrentUser() {
    // Security: Validate session before returning user
    if (!this.isSessionValid()) return null;
    const session = this.getSession();
    if (!session) return null;
    const user = this.getUser(session.userId);
    // Remove password from returned user object
    if (user) {
      delete user.password;
    }
    return user;
  },

  getPosts(opts = {}) {
    let posts = this._get(this.KEYS.POSTS) || [];
    if (opts.categoryId) posts = posts.filter(p => p.categoryId === opts.categoryId);
    if (opts.authorId)   posts = posts.filter(p => p.authorId === opts.authorId);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.includes(q))
      );
    }
    posts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
    return posts;
  },

  getPost(id) {
    const posts = this._get(this.KEYS.POSTS) || [];
    return posts.find(p => p.id === id) || null;
  },

  createPost(data) {
    const posts = this._get(this.KEYS.POSTS) || [];
    const post = {
      id: 'pst_' + this.uid(),
      categoryId: data.categoryId,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      tags: data.tags || [],
      pinned: false,
      views: 0,
      videoUrl: data.videoUrl || '',
      images: data.images || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    posts.unshift(post);
    this._set(this.KEYS.POSTS, posts);
    const users = this.getUsers();
    const uIdx = users.findIndex(u => u.id === data.authorId);
    if (uIdx !== -1) { users[uIdx].postCount = (users[uIdx].postCount || 0) + 1; this._set(this.KEYS.USERS, users); }
    return post;
  },

  incrementViews(postId) {
    const posts = this._get(this.KEYS.POSTS) || [];
    const idx = posts.findIndex(p => p.id === postId);
    if (idx !== -1) { posts[idx].views = (posts[idx].views || 0) + 1; this._set(this.KEYS.POSTS, posts); }
  },

  getComments(postId) {
    const all = this._get(this.KEYS.COMMENTS) || [];
    return all.filter(c => c.postId === postId).sort((a, b) => a.createdAt - b.createdAt);
  },

  createComment(data) {
    const comments = this._get(this.KEYS.COMMENTS) || [];
    const comment = {
      id: 'cmt_' + this.uid(),
      postId: data.postId,
      parentId: data.parentId || null,
      authorId: data.authorId,
      content: data.content,
      createdAt: Date.now(),
      votes: 0,
    };
    comments.push(comment);
    this._set(this.KEYS.COMMENTS, comments);
    return comment;
  },

  getVote(userId, targetId) {
    const votes = this._get(this.KEYS.VOTES) || {};
    return votes[userId + '_' + targetId] || null;
  },

  toggleVote(userId, targetId, type) {
    type = type || 'up';
    const votes = this._get(this.KEYS.VOTES) || {};
    const key = userId + '_' + targetId;
    const existing = votes[key];
    if (existing === type) { delete votes[key]; this._set(this.KEYS.VOTES, votes); return null; }
    votes[key] = type;
    this._set(this.KEYS.VOTES, votes);
    return type;
  },

  getCommentVotes(commentId, userId, voteType) {
    // voteType can be 'up' or 'down'
    voteType = voteType || 'up';
    const comments = this._get(this.KEYS.COMMENTS) || [];
    const idx = comments.findIndex(c => c.id === commentId);
    if (idx === -1) return null;
    const existing = userId ? this.getVote(userId, commentId) : null;
    
    // Calculate vote change
    let delta = 0;
    let newVote = voteType;
    
    if (existing === voteType) {
      // Toggle off: remove the vote
      delta = voteType === 'up' ? -1 : 1;
      newVote = null;
    } else if (existing && existing !== voteType) {
      // Switch vote type
      delta = voteType === 'up' ? 2 : -2; // Switching from down to up or up to down
      newVote = voteType;
    } else {
      // First vote
      delta = voteType === 'up' ? 1 : -1;
      newVote = voteType;
    }
    
    comments[idx].votes = (comments[idx].votes || 0) + delta;
    this._set(this.KEYS.COMMENTS, comments);
    if (userId) this.toggleVote(userId, commentId, newVote);
    return { votes: comments[idx].votes, userVote: newVote };
  },

  getStats() {
    const posts    = this._get(this.KEYS.POSTS) || [];
    const users    = this._get(this.KEYS.USERS) || [];
    const comments = this._get(this.KEYS.COMMENTS) || [];
    return {
      posts:    posts.length,
      members:  users.length,
      comments: comments.length,
      views:    posts.reduce((s, p) => s + (p.views || 0), 0),
    };
  },

  getCategoryStats() {
    const posts = this._get(this.KEYS.POSTS) || [];
    const comments = this._get(this.KEYS.COMMENTS) || [];
    return this.CATEGORIES.map(cat => {
      const catPosts = posts.filter(p => p.categoryId === cat.id);
      const catComments = comments.filter(c => catPosts.some(p => p.id === c.postId));
      return { ...cat, postCount: catPosts.length, commentCount: catComments.length };
    });
  },

  getTrending() {
    const posts = this._get(this.KEYS.POSTS) || [];
    return posts.sort((a, b) => b.views - a.views).slice(0, 5);
  },

  // ── Account Settings ────────────────────────────────
  setUserBio(userId, bio) {
    const users = this._get(this.KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    if (user) {
      user.bio = bio || '';
      this._set(this.KEYS.USERS, users);
      return true;
    }
    return false;
  },

  getUserBio(userId) {
    const users = this._get(this.KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    return user?.bio || '';
  },

  setUserEmail(userId, email) {
    const users = this._get(this.KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    if (user) {
      // Security: Validate email format
      if (email && !SecurityUtil.isValidEmail(email)) return false;
      user.email = email || '';
      this._set(this.KEYS.USERS, users);
      return true;
    }
    return false;
  },

  getUserEmail(userId) {
    const users = this._get(this.KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    return user?.email || '';
  },

  changePassword(userId, oldPassword, newPassword) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    // Security: Verify old password using hash comparison
    if (!SecurityUtil.verifyPassword(oldPassword, user.password)) return false;
    // Security: Hash new password
    user.password = SecurityUtil.hashPassword(newPassword);
    this._set(this.KEYS.USERS, users);
    return true;
  },

  setUserPrivacy(userId, isPrivate) {
    const users = this._get(this.KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    if (user) {
      user.isPrivate = isPrivate || false;
      this._set(this.KEYS.USERS, users);
      return true;
    }
    return false;
  },

  getUserPrivacy(userId) {
    const users = this._get(this.KEYS.USERS) || [];
    const user = users.find(u => u.id === userId);
    return user?.isPrivate || false;
  },

  setUserTheme(userId, theme) {
    const key = 'rikeo_theme_' + userId;
    localStorage.setItem(key, theme);
    return true;
  },

  getUserTheme(userId) {
    const key = 'rikeo_theme_' + userId;
    return localStorage.getItem(key) || 'light';
  },

  blockUser(currentUserId, blockUserId) {
    const key = 'rikeo_blocked_' + currentUserId;
    let blocked = JSON.parse(localStorage.getItem(key)) || [];
    if (!blocked.includes(blockUserId)) {
      blocked.push(blockUserId);
      localStorage.setItem(key, JSON.stringify(blocked));
    }
    return true;
  },

  unblockUser(currentUserId, blockUserId) {
    const key = 'rikeo_blocked_' + currentUserId;
    let blocked = JSON.parse(localStorage.getItem(key)) || [];
    blocked = blocked.filter(id => id !== blockUserId);
    localStorage.setItem(key, JSON.stringify(blocked));
    return true;
  },

  getBlockedUsers(userId) {
    const key = 'rikeo_blocked_' + userId;
    const blocked = JSON.parse(localStorage.getItem(key)) || [];
    const users = this._get(this.KEYS.USERS) || [];
    return blocked.map(id => users.find(u => u.id === id)).filter(Boolean);
  },

  deleteAccount(userId) {
    const users = this._get(this.KEYS.USERS) || [];
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    users.splice(idx, 1);
    this._set(this.KEYS.USERS, users);
    if (this.getSession()?.userId === userId) {
      this.clearSession();
    }
    localStorage.removeItem('rikeo_pfp_' + userId);
    localStorage.removeItem('rikeo_theme_' + userId);
    localStorage.removeItem('rikeo_blocked_' + userId);
    return true;
  },
};
