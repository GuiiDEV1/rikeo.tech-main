/**
 * RIKEO.TECH — App Utilities
 * Shared helpers: auth modals, toasts, time formatting, etc.
 */

// ── XSS Prevention ─────────────────────────────────────────
/**
 * SECURITY: Sanitize user input to prevent XSS attacks
 */
function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * SECURITY: Escape HTML special characters
 */
function escapeHTML(str) {
  if (!str) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

// ── Time formatting ────────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ── Theme Management ──────────────────────────────────────
function applyTheme(theme = null) {
  if (!theme) {
    const user = getCurrentUser();
    theme = user ? DB.getUserTheme(user.id) : 'dark';
  }
  
  // Remove all theme classes
  document.documentElement.classList.remove('light', 'dark', 'auto');
  
  // Apply new theme
  if (theme === 'auto') {
    document.documentElement.classList.add('auto');
  } else if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.add('dark');
  }
  
  // Store for access
  document.documentElement.dataset.theme = theme;
}

// ── Toasts ────────────────────────────────────────────────
function showToast(msg, type = 'default', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// ── Modal ─────────────────────────────────────────────────
function openModal(content) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `<div class="modal">${content}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  const firstInput = overlay.querySelector('input, textarea, select');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModal() {
  const existing = document.getElementById('active-modal');
  if (existing) { existing.remove(); document.body.style.overflow = ''; }
}

// ── Auth ──────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getCurrentUser() {
  // Try backend API first
  if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
    return AuthService.getCurrentUser();
  }
  // Fallback to localStorage (for demo accounts)
  const session = DB.getSession();
  if (session && DB.isSessionValid()) {
    return DB.getCurrentUser();
  }
  return null;
}

function requireAuth(cb) {
  const user = getCurrentUser();
  if (user) { cb(user); return; }
  showAuthModal('login', cb);
}

function showAuthModal(tab = 'login', onSuccess) {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title" id="auth-modal-title">${tab === 'login' ? 'Sign In' : 'Join RIKEO'}</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:0;margin-bottom:24px;border-bottom:1px solid var(--border);">
        <button class="profile-tab ${tab === 'login' ? 'active' : ''}" id="tab-login" onclick="switchAuthTab('login')">Sign In</button>
        <button class="profile-tab ${tab === 'register' ? 'active' : ''}" id="tab-register" onclick="switchAuthTab('register')">Create Account</button>
      </div>
      <div id="auth-form-container"></div>
      <p id="auth-error" class="form-error mt-8 hidden"></p>
    </div>
  `);
  window._authSuccessCallback = onSuccess;
  renderAuthForm(tab);
}

function switchAuthTab(tab) {
  document.querySelectorAll('#active-modal .profile-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('auth-modal-title').textContent = tab === 'login' ? 'Sign In' : 'Join RIKEO';
  renderAuthForm(tab);
}

function renderAuthForm(tab) {
  const container = document.getElementById('auth-form-container');
  if (!container) return;
  if (tab === 'login') {
    container.innerHTML = `
      <div class="form-group mb-16">
        <label class="form-label">Email or Username</label>
        <input class="form-input" id="auth-emailusername" type="text" placeholder="your@email.com or your_handle" autocomplete="username">
      </div>
      <div class="form-group mb-24">
        <label class="form-label">Password</label>
        <input class="form-input" id="auth-password" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="handleLogin()">Sign In</button>
      <div style="text-align:center;margin-top:12px;">
        <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.85rem;text-decoration:underline;" onclick="showForgotPasswordModal()">Forgot password?</button>
      </div>
    `;
  } else {
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
  }

  // Allow Enter key
  container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent default form submission
        if (tab === 'login') handleLogin();
        else handleRegister();
      }
    });
  });
}

async function handleLogin() {
  // Get or find the login button (not always event.target since it could be an input field)
  let btn = event?.target?.classList?.contains('btn') ? event.target : 
            document.querySelector('[onclick="handleLogin()"]');
  
  // Prevent double submission
  if (btn && btn.disabled) return;
  if (btn) btn.disabled = true;

  const emailOrUsername = document.getElementById('auth-emailusername')?.value.trim() || '';
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');

  if (!emailOrUsername || !password) {
    showError(errorEl, 'Please fill all fields.');
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const originalText = btn ? btn.textContent : 'Sign In';
    if (btn) btn.textContent = 'Signing In...';

    // Login via backend API
    const result = await AuthService.login(emailOrUsername, password);

    closeModal();
    showToast(`Welcome back, ${result.user.displayName}!`, 'success');
    updateAuthUI();

    if (window._authSuccessCallback) {
      window._authSuccessCallback(result.user);
      window._authSuccessCallback = null;
    }

    // Refresh page to show authenticated state
    setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    showError(errorEl, error.message || 'Login failed.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

async function handleRegister() {
  // Get or find the register button (not always event.target since it could be an input field)
  let btn = event?.target?.classList?.contains('btn') ? event.target : 
            document.querySelector('[onclick="handleRegister()"]');
  
  // Prevent double submission
  if (btn && btn.disabled) return;
  if (btn) btn.disabled = true;

  const username    = document.getElementById('auth-username').value.trim().toLowerCase();
  const displayName = document.getElementById('auth-displayname')?.value.trim() || username;
  const email       = document.getElementById('auth-email')?.value.trim().toLowerCase() || '';
  const password    = document.getElementById('auth-password').value;
  const errorEl     = document.getElementById('auth-error');

  // Validation
  if (!username || !displayName || !email || !password) {
    showError(errorEl, 'Please fill all required fields.');
    if (btn) btn.disabled = false;
    return;
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    showError(errorEl, 'Username: 3–20 chars, lowercase letters, numbers, underscores.');
    if (btn) btn.disabled = false;
    return;
  }

  if (!isValidEmail(email)) {
    showError(errorEl, 'Please enter a valid email address.');
    if (btn) btn.disabled = false;
    return;
  }

  if (password.length < 6) {
    showError(errorEl, 'Password must be at least 6 characters.');
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const originalText = btn ? btn.textContent : 'Create Account';
    if (btn) btn.textContent = 'Creating Account...';

    // Register via backend API
    const result = await AuthService.register(username, displayName, email, password, password);

    showToast('Account created successfully! Check your email to verify.', 'success');
    closeModal();

    // Show email verification modal
    setTimeout(() => {
      showEmailVerificationModal(email, result.userId, result.verificationCode);
    }, 500);
  } catch (error) {
    showError(errorEl, error.message || 'Registration failed. Please try again.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function logout() {
  // Clear backend auth
  if (typeof AuthService !== 'undefined') {
    AuthService.logout();
  }
  // Clear localStorage fallback
  DB.clearSession();
  updateAuthUI();
  showToast('Signed out.', 'default');
  // Refresh page to show logged-out state
  setTimeout(() => window.location.href = 'index.html', 800);
}

function updateAuthUI() {
  const user = getCurrentUser();
  const authBtn     = document.getElementById('auth-btn');
  const userMenu    = document.getElementById('user-menu');
  const avatarEl    = document.getElementById('user-avatar-display');
  const createBtn   = document.getElementById('create-post-nav');

  if (authBtn) authBtn.classList.toggle('hidden', !!user);
  if (userMenu) userMenu.classList.toggle('hidden', !user);
  if (createBtn) createBtn.classList.toggle('hidden', !user);
  // Avatar is already rendered in the header, don't update it here

  // Update notification badge
  updateNotificationBadge();
}

// ── Moderation ───────────────────────────────────────────
function showReportModal(targetType, targetId, targetTitle) {
  const user = getCurrentUser();
  if (!user || !AuthService.isAuthenticated()) {
    showAuthModal('login', () => showReportModal(targetType, targetId, targetTitle));
    return;
  }

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Report ${targetType === 'post' ? 'Post' : 'Comment'}</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px">Help us keep the community safe. Please tell us why you're reporting this.</p>
      <div class="form-group mb-16">
        <label class="form-label">Reason</label>
        <select class="form-input" id="report-reason" style="appearance:auto">
          <option value="">Select a reason...</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment or Bullying</option>
          <option value="offensive">Offensive or Abusive Content</option>
          <option value="misinformation">Misinformation</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group mb-24">
        <label class="form-label">Additional Details (Optional)</label>
        <textarea class="form-input" id="report-description" placeholder="Provide any additional context..." style="resize:vertical;min-height:80px;font-family:inherit"></textarea>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="handleSubmitReport('${targetType}', '${targetId}')">Submit Report</button>
      <p id="report-error" class="form-error mt-8 hidden"></p>
    </div>
  `);
}

async function handleSubmitReport(targetType, targetId) {
  const reason = document.getElementById('report-reason')?.value.trim();
  const description = document.getElementById('report-description')?.value.trim();
  const errorEl = document.getElementById('report-error');

  if (!reason) {
    showError(errorEl, 'Please select a reason for your report.');
    return;
  }

  try {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    await ModerationService.reportContent(targetType, targetId, reason, description);

    closeModal();
    showToast('Thank you for reporting. Our team will review it shortly.', 'success');
  } catch (error) {
    showError(errorEl, error.message || 'Failed to submit report.');
    const btn = event.target;
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

function showAdminPanel() {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    showToast('Admin access required.', 'error');
    return;
  }

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Moderation Panel</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" style="max-height:600px;overflow-y:auto">
      <div style="margin-bottom:16px;display:flex;gap:8px">
        <button class="btn btn-sm btn-outline" onclick="loadAdminReports('open', 1)">Open (${window._adminOpenCount || 0})</button>
        <button class="btn btn-sm btn-outline" onclick="loadAdminReports('reviewing', 1)">Reviewing</button>
        <button class="btn btn-sm btn-outline" onclick="loadAdminReports('resolved', 1)">Resolved</button>
      </div>
      <div id="admin-reports-container" style="min-height:200px">
        <div style="text-align:center;color:var(--text-secondary)">Loading reports...</div>
      </div>
    </div>
  `);

  loadAdminReports('open', 1);
}

async function loadAdminReports(status, page) {
  const container = document.getElementById('admin-reports-container');
  if (!container) return;

  try {
    const result = await ModerationService.getReports(status, page, 10);
    const { reports, pagination } = result;

    if (reports.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-secondary)">
          No ${status} reports found.
        </div>
      `;
      window._adminOpenCount = 0;
      return;
    }

    let html = '<div style="space-y:8px">';
    reports.forEach(r => {
      const authorStr = r.reporterId ? `@${r.reporterId.username}` : 'Anonymous';
      html += `
        <div style="padding:12px;border:1px solid var(--border);border-radius:4px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <strong>${r.reason.toUpperCase()}</strong>
              <div style="font-size:0.8rem;color:var(--text-secondary)">By ${authorStr} • ${formatDate(r.createdAt)}</div>
            </div>
            <span style="font-size:0.75rem;padding:4px 8px;background:var(--accent);color:white;border-radius:4px">${r.status}</span>
          </div>
          <div style="font-size:0.9rem;margin-bottom:8px">${escapeHtml(r.description || '(No description)')}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm" onclick="moderateReport('${r._id}', 'reviewing', 'warning')" style="font-size:0.8rem">Review</button>
            <button class="btn btn-sm" onclick="moderateReport('${r._id}', 'resolved', 'deleted')" style="font-size:0.8rem;background:var(--red)">Delete</button>
            <button class="btn btn-sm" onclick="moderateReport('${r._id}', 'dismissed', 'none')" style="font-size:0.8rem;opacity:0.6">Dismiss</button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
    if (status === 'open') window._adminOpenCount = pagination.total;
  } catch (error) {
    container.innerHTML = `<div style="color:var(--text-error)">Failed to load reports: ${error.message}</div>`;
  }
}

async function moderateReport(reportId, newStatus, action) {
  try {
    await ModerationService.resolveReport(reportId, newStatus, action);
    showToast('Report ' + newStatus, 'success');
    loadAdminReports('open', 1);
  } catch (error) {
    showToast(error.message || 'Failed to moderate report', 'error');
  }
}

// ── Direct Messaging ─────────────────────────────────────
async function showMessagesInterface() {
  const user = getCurrentUser();
  if (!user || !AuthService.isAuthenticated()) {
    showAuthModal('login', showMessagesInterface);
    return;
  }

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Messages</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" style="display:flex;gap:16px;max-height:600px;min-width:500px">
      <div style="flex:0 0 150px;border-right:1px solid var(--border);overflow-y:auto">
        <div style="padding:8px 0">
          <div style="padding:8px;font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);letter-spacing:0.05em">Conversations</div>
          <div id="conversations-list" style="max-height:520px;overflow-y:auto">
            <div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:0.9rem">Loading...</div>
          </div>
        </div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column">
        <div id="message-thread" style="flex:1;overflow-y:auto;margin-bottom:12px;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-subtle);min-height:300px;display:flex;flex-direction:column;justify-content:flex-end">
          <div style="text-align:center;color:var(--text-secondary)">Select a conversation to start messaging</div>
        </div>
        <div id="message-input-area" style="display:none;gap:8px;display:flex">
          <input type="text" id="message-input" placeholder="Type a message..." style="flex:1;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text);font-family:inherit">
          <button class="btn btn-primary btn-sm" onclick="sendDirectMessage()" style="padding:8px 16px">Send</button>
        </div>
      </div>
    </div>
  `);

  loadConversationsList();
}

async function loadConversationsList() {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  try {
    const result = await MessageService.getConversations(20, 0);
    const { conversations } = result;

    if (conversations.length === 0) {
      container.innerHTML = `
        <div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:0.85rem">
          No conversations yet
        </div>
      `;
      return;
    }

    let html = '';
    conversations.forEach(conv => {
      const unreadBadge = conv.unreadCount > 0 ? `<span style="background:var(--accent);color:white;padding:2px 6px;border-radius:10px;font-size:0.7rem">${conv.unreadCount}</span>` : '';
      html += `
        <div onclick="loadConversation('${conv.userId}')" style="padding:10px;border-bottom:1px solid var(--border);cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <strong style="font-size:0.85rem">${conv.displayName}</strong>
            ${unreadBadge}
          </div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">@${conv.username}</div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `
      <div style="padding:12px;color:var(--text-error);font-size:0.85rem">
        Failed to load conversations
      </div>
    `;
    console.error('Load conversations error:', error);
  }
}

async function loadConversation(otherUserId) {
  const threadContainer = document.getElementById('message-thread');
  const inputArea = document.getElementById('message-input-area');

  if (!threadContainer || !inputArea) return;

  try {
    const result = await MessageService.getConversation(otherUserId, 30, 0);
    const { messages } = result;

    window._currentConversationUserId = otherUserId;

    let html = '';
    const currentUser = getCurrentUser();
    
    messages.forEach(msg => {
      const isSent = msg.senderId._id === currentUser.id;
      const sideClass = isSent ? 'text-right' : 'text-left';
      const bgClass = isSent ? 'background:var(--accent);color:white' : 'background:var(--bg-primary);color:var(--text)';
      
      html += `
        <div style="margin-bottom:8px;${sideClass}">
          <div style="display:inline-block;max-width:70%;padding:8px 12px;border-radius:8px;${bgClass};word-wrap:break-word">
            ${escapeHtml(msg.content)}
          </div>
          <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:2px">${formatDate(msg.createdAt)}</div>
        </div>
      `;
    });

    threadContainer.innerHTML = html;
    threadContainer.scrollTop = threadContainer.scrollHeight;

    // Show input area
    inputArea.style.display = 'flex';

    // Focus on input
    setTimeout(() => {
      document.getElementById('message-input')?.focus();
    }, 0);
  } catch (error) {
    threadContainer.innerHTML = `<div style="color:var(--text-error)">Failed to load conversation</div>`;
    console.error('Load conversation error:', error);
  }
}

async function sendDirectMessage() {
  const input = document.getElementById('message-input');
  const content = input?.value?.trim();

  if (!content) {
    showToast('Message cannot be empty', 'default');
    return;
  }

  if (!window._currentConversationUserId) {
    showToast('No conversation selected', 'error');
    return;
  }

  try {
    input.disabled = true;
    await MessageService.sendMessage(window._currentConversationUserId, content);
    input.value = '';
    input.disabled = false;

    // Reload the conversation
    loadConversation(window._currentConversationUserId);
  } catch (error) {
    input.disabled = false;
    showToast(error.message || 'Failed to send message', 'error');
  }
}

function startDirectMessage(userId, displayName) {
  showMessagesInterface();
  setTimeout(() => {
    loadConversation(userId);
  }, 500);
}

// ── User Features (Search, Follow, Bookmarks) ─────────────
async function showUserSearchModal() {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Find Users</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group mb-16">
        <label class="form-label">Search for users</label>
        <input class="form-input" id="user-search-input" type="text" placeholder="username or name..." autocomplete="off" onkeyup="handleUserSearch(this.value)">
      </div>
      <div id="user-search-results" style="min-height:100px">
        <div style="color:var(--text-secondary);text-align:center;font-size:0.9rem">Enter at least 2 characters to search</div>
      </div>
    </div>
  `);
}

async function handleUserSearch(query) {
  const container = document.getElementById('user-search-results');
  if (!container) return;

  if (!query || query.length < 2) {
    container.innerHTML = '<div style="color:var(--text-secondary);text-align:center;font-size:0.9rem">Enter at least 2 characters to search</div>';
    return;
  }

  try {
    container.innerHTML = '<div style="text-align:center;color:var(--text-secondary)">Searching...</div>';
    const result = await UserService.searchUsers(query);
    const { users } = result;

    if (users.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-secondary)">No users found</div>';
      return;
    }

    let html = '';
    users.forEach(u => {
      html += `
        <div style="padding:12px;border:1px solid var(--border);border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <div style="flex:1">
            <a href="profile.html?u=${u.username}" style="text-decoration:none;color:var(--accent)">
              <strong>${escapeHtml(u.displayName)}</strong>
              <div style="font-size:0.8rem;color:var(--text-secondary)">@${u.username} • ${u.followerCount} followers</div>
            </a>
            ${u.bio ? `<div style="font-size:0.85rem;margin-top:4px;color:var(--text-secondary)">${escapeHtml(u.bio.slice(0, 100))}</div>` : ''}
          </div>
          <button class="btn btn-sm btn-outline" onclick="toggleFollowUser('${u.id}', this)" style="margin-left:8px">Follow</button>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div style="color:var(--text-error)">Search failed: ${error.message}</div>`;
  }
}

async function toggleFollowUser(userId, button) {
  const user = getCurrentUser();
  if (!user || !AuthService.isAuthenticated()) {
    showAuthModal('login', () => toggleFollowUser(userId, button));
    return;
  }

  try {
    button.disabled = true;
    const isFollowing = button.textContent === 'Following';

    if (isFollowing) {
      await UserService.unfollowUser(userId);
      button.textContent = 'Follow';
    } else {
      await UserService.followUser(userId);
      button.textContent = 'Following';
    }
  } catch (error) {
    showToast(error.message || 'Failed to update follow status', 'error');
    button.disabled = false;
  }
}

function showPostSortMenu() {
  const currentSort = window._currentPostSort || 'recent';
  
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Sort Posts</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn ${currentSort === 'recent' ? 'btn-primary' : 'btn-outline'}" style="text-align:left;padding:12px;justify-content:flex-start" onclick="setSortAndClose('recent')">
          <strong>📅 Most Recent</strong>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Newest posts first</div>
        </button>
        <button class="btn ${currentSort === 'popular' ? 'btn-primary' : 'btn-outline'}" style="text-align:left;padding:12px;justify-content:flex-start" onclick="setSortAndClose('popular')">
          <strong>⭐ Most Popular</strong>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Most comments and activity</div>
        </button>
        <button class="btn ${currentSort === 'trending' ? 'btn-primary' : 'btn-outline'}" style="text-align:left;padding:12px;justify-content:flex-start" onclick="setSortAndClose('trending')">
          <strong>🔥 Trending</strong>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Hot posts from last 24h</div>
        </button>
      </div>
    </div>
  `);
}

function setSortAndClose(sortType) {
  window._currentPostSort = sortType;
  closeModal();
  
  // Trigger re-render if we're on forums/home
  if (typeof loadForumPosts === 'function') {
    loadForumPosts();
  }
  
  showToast('Sorting by ' + 
    (sortType === 'recent' ? 'most recent' : 
     sortType === 'popular' ? 'most popular' : 'trending'), 'success');
}

async function toggleBookmarkPost(postId, button) {
  const user = getCurrentUser();
  if (!user || !AuthService.isAuthenticated()) {
    showAuthModal('login', () => toggleBookmarkPost(postId, button));
    return;
  }

  try {
    button.disabled = true;
    const isBookmarked = button.classList.contains('bookmarked');

    if (isBookmarked) {
      await BookmarkService.removeBookmark(postId);
      button.classList.remove('bookmarked');
      button.textContent = '🔖';
      button.title = 'Bookmark this post';
    } else {
      await BookmarkService.bookmarkPost(postId);
      button.classList.add('bookmarked');
      button.textContent = '📌';
      button.title = 'Remove bookmark';
    }
    
    button.disabled = false;
  } catch (error) {
    showToast(error.message || 'Failed to bookmark post', 'error');
    button.disabled = false;
  }
}

async function showBookmarksModal() {
  const user = getCurrentUser();
  if (!user || !AuthService.isAuthenticated()) {
    showAuthModal('login', showBookmarksModal);
    return;
  }

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Bookmarks</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" style="max-height:600px;overflow-y:auto">
      <div id="bookmarks-container" style="min-height:200px">
        <div style="text-align:center;color:var(--text-secondary)">Loading bookmarks...</div>
      </div>
    </div>
  `);

  loadBookmarks();
}

async function loadBookmarks() {
  const container = document.getElementById('bookmarks-container');
  if (!container) return;

  try {
    const result = await BookmarkService.getBookmarks(1, 30);
    const { bookmarks } = result;

    if (bookmarks.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-secondary)">
          <div style="font-size:2rem;margin-bottom:8px">🔖</div>
          <div>No bookmarks yet</div>
          <p style="font-size:0.9rem;margin-top:8px">Bookmark posts to save them for later</p>
        </div>
      `;
      return;
    }

    let html = '<div style="space-y:8px">';
    bookmarks.forEach(b => {
      // In a real app, would fetch post details here
      html += `
        <div style="padding:12px;border:1px solid var(--border);border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <div style="flex:1">
            <div style="font-weight:600">Post ${escapeHtml(b.postId.toString().slice(0, 8))}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Saved ${formatDate(b.createdAt)}</div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="removeBookmarkModal('${b.postId}')" style="margin-left:8px;color:var(--red)">Remove</button>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div style="color:var(--text-error)">Failed to load bookmarks: ${error.message}</div>`;
  }
}

async function removeBookmarkModal(postId) {
  try {
    await BookmarkService.removeBookmark(postId);
    loadBookmarks();
    showToast('Bookmark removed', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to remove bookmark', 'error');
  }
}


// ── Password Reset (Forgot Password) ──────────────────────
function showForgotPasswordModal() {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Reset Password</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:16px;font-size:0.9rem;color:var(--text-secondary);">Enter your email address and we'll send you a password reset code.</p>
      <div class="form-group mb-24">
        <label class="form-label">Email</label>
        <input class="form-input" id="forgot-email" type="email" placeholder="your@email.com" autocomplete="email">
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="handleForgotPassword()">Send Reset Code</button>
      <p id="forgot-error" class="form-error mt-8 hidden"></p>
      <div style="text-align:center;margin-top:12px;">
        <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.85rem;text-decoration:underline;" onclick="showAuthModal('login')">Back to Sign In</button>
      </div>
    </div>
  `);
}

async function handleForgotPassword() {
  const email = document.getElementById('forgot-email')?.value.trim().toLowerCase() || '';
  const errorEl = document.getElementById('forgot-error');

  if (!email) {
    showError(errorEl, 'Please enter your email address.');
    return;
  }

  if (!isValidEmail(email)) {
    showError(errorEl, 'Please enter a valid email address.');
    return;
  }

  try {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    // Request password reset token from API
    const result = await AuthService.forgotPassword(email);

    closeModal();
    showToast('Password reset code sent to your email. Check your inbox.', 'success');

    // Show password reset modal
    setTimeout(() => {
      showResetPasswordModal(email, result.resetCode);
    }, 500);
  } catch (error) {
    showError(errorEl, error.message || 'Failed to send reset code.');
    const btn = event.target;
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

function showResetPasswordModal(email, resetCode) {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Create New Password</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:16px;font-size:0.9rem;color:var(--text-secondary);">Enter your reset code and new password.</p>
      <div class="form-group mb-16">
        <label class="form-label">Reset Code</label>
        <input class="form-input" id="reset-code" type="text" placeholder="Your reset code">
      </div>
      <div class="form-group mb-16">
        <label class="form-label">New Password</label>
        <input class="form-input" id="reset-password" type="password" placeholder="••••••••" autocomplete="new-password">
      </div>
      <div class="form-group mb-24">
        <label class="form-label">Confirm Password</label>
        <input class="form-input" id="reset-password-confirm" type="password" placeholder="••••••••" autocomplete="new-password">
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="handleResetPassword('${email}')">Reset Password</button>
      <p id="reset-error" class="form-error mt-8 hidden"></p>
    </div>
  `);

  // Store email and code for reference
  window._resetEmail = email;
  window._resetCode = resetCode;

  // Allow Enter key
  const container = document.getElementById('active-modal');
  if (container) {
    container.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.target.classList.contains('prevent-submit')) {
          handleResetPassword(email);
        }
      });
    });
  }
}

async function handleResetPassword(email) {
  const resetCode = document.getElementById('reset-code')?.value.trim() || '';
  const newPassword = document.getElementById('reset-password')?.value || '';
  const confirmPassword = document.getElementById('reset-password-confirm')?.value || '';
  const errorEl = document.getElementById('reset-error');

  // Validation
  if (!resetCode || !newPassword || !confirmPassword) {
    showError(errorEl, 'Please fill all fields.');
    return;
  }

  if (newPassword.length < 6) {
    showError(errorEl, 'Password must be at least 6 characters.');
    return;
  }

  if (newPassword !== confirmPassword) {
    showError(errorEl, 'Passwords do not match.');
    return;
  }

  try {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Resetting...';

    // Call password reset API
    const result = await AuthService.resetPassword(email, resetCode, newPassword, confirmPassword);

    closeModal();
    showToast('Password reset successfully! You can now sign in.', 'success');

    // Redirect to login
    setTimeout(() => {
      showAuthModal('login');
    }, 1500);
  } catch (error) {
    showError(errorEl, error.message || 'Failed to reset password.');
    const btn = event.target;
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

// ── Notifications ────────────────────────────────────────
async function updateNotificationBadge() {
  const user = getCurrentUser();
  if (!user || !AuthService.isAuthenticated()) {
    document.getElementById('notification-badge')?.classList.add('hidden');
    return;
  }

  try {
    const count = await NotificationService.getUnreadCount();
    const badge = document.getElementById('notification-badge');
    if (badge) {
      badge.classList.toggle('hidden', count === 0);
      badge.textContent = count > 99 ? '99+' : count;
    }
  } catch (error) {
    console.error('Error updating notification badge:', error);
  }
}

function showNotificationsModal() {
  const user = getCurrentUser();
  if (!user || !AuthService.isAuthenticated()) {
    showToast('Please sign in to view notifications.', 'default');
    return;
  }

  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Notifications</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body" style="max-height:500px;overflow-y:auto">
      <div id="notifications-container" style="min-height:100px;display:flex;align-items:center;justify-content:center;">
        <div style="color:var(--text-secondary);text-align:center">Loading notifications...</div>
      </div>
    </div>
  `);

  loadNotifications();
}

async function loadNotifications(page = 1) {
  const container = document.getElementById('notifications-container');
  if (!container) return;

  // Check if user is authenticated
  if (!AuthService.isAuthenticated()) {
    container.innerHTML = `
      <div style="color:var(--text-secondary);text-align:center;padding:20px">
        Please log in to view notifications
      </div>
    `;
    return;
  }

  try {
    const result = await NotificationService.getNotifications(page, 10);
    const { notifications } = result;

    if (notifications.length === 0) {
      container.innerHTML = `
        <div style="width:100%;text-align:center;padding:40px 20px;color:var(--text-secondary)">
          <div style="font-size:3rem;margin-bottom:8px">◈</div>
          <div>No notifications yet</div>
        </div>
      `;
      return;
    }

    // Group by date
    const groups = {};
    notifications.forEach(n => {
      const date = formatDate(n.createdAt).split(' at ')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(n);
    });

    let html = '';
    Object.entries(groups).forEach(([date, items]) => {
      html += `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px;letter-spacing:0.05em">${date}</div>`;
      
      items.forEach(n => {
        const author = n.authorId ? `${n.authorId.displayName}` : 'Someone';
        const unreadClass = n.isRead ? '' : ' style="background:var(--bg-hover);border-left:2px solid var(--accent)"';
        html += `
          <div class="notification-item"${unreadClass} style="padding:8px 12px;margin-bottom:4px;border-radius:4px;cursor:pointer;transition:all 0.2s">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div style="flex:1">
                <strong>${author}</strong>
                <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:2px">${n.message}</div>
              </div>
              <button class="btn btn-sm disabled" style="font-size:0.75rem;padding:2px 6px;opacity:0.5" onclick="deleteNotification('${n._id}')">×</button>
            </div>
          </div>
        `;
        
        // Mark as read on click
        setTimeout(() => {
          const notifEl = container.querySelector(`[data-notif-id="${n._id}"]`);
          if (notifEl) {
            notifEl.addEventListener('click', () => markNotificationRead(n._id));
          }
        }, 0);
      });
      
      html += '</div>';
    });

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `
      <div style="color:var(--text-error);text-align:center;padding:20px">
        Failed to load notifications
      </div>
    `;
    console.error('Load notifications error:', error);
  }
}

async function markNotificationRead(notificationId) {
  try {
    await NotificationService.markAsRead(notificationId);
    updateNotificationBadge();
    loadNotifications();
  } catch (error) {
    showToast(error.message || 'Failed to mark notification as read', 'error');
  }
}

async function deleteNotification(notificationId) {
  try {
    await NotificationService.deleteNotification(notificationId);
    updateNotificationBadge();
    loadNotifications();
  } catch (error) {
    showToast(error.message || 'Failed to delete notification', 'error');
  }
}

// ── Sanitize HTML ─────────────────────────────────────────
// Simple allowlist sanitizer to prevent XSS.
// In production, use DOMPurify or equivalent.
function sanitizeHTML(html) {
  const ALLOWED_TAGS = ['p','br','strong','em','b','i','u','h2','h3','blockquote','code','pre','a','ul','ol','li','img'];
  const ALLOWED_ATTRS = { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'] };
  const DANGEROUS_ATTR_PATTERNS = [/^on\w+/i, /javascript:/i]; // onclick, onload, javascript: etc
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return node;
    if (node.nodeType !== Node.ELEMENT_NODE) { node.remove(); return null; }
    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.includes(tag)) {
      // Replace disallowed element with its text content
      const text = document.createTextNode(node.textContent);
      node.replaceWith(text);
      return text;
    }
    // Strip disallowed attributes and check for dangerous patterns
    [...node.attributes].forEach(attr => {
      const allowed = ALLOWED_ATTRS[tag] || [];
      // Block dangerous attribute names (onclick, onload, etc)
      if (DANGEROUS_ATTR_PATTERNS.some(p => p.test(attr.name))) {
        node.removeAttribute(attr.name);
        return;
      }
      if (!allowed.includes(attr.name)) node.removeAttribute(attr.name);
    });
    // Validate href: only allow http:, https:, and relative URLs
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      if (href && !/^(https?:\/\/|\/|#|\?|\.)/i.test(href)) node.removeAttribute('href');
      // Also check for javascript: protocol
      if (href && /javascript:/i.test(href)) node.removeAttribute('href');
    }
    // Validate img src: only allow http: and https: URLs (block data: URLs to prevent XSS)
    if (tag === 'img') {
      const src = node.getAttribute('src') || '';
      if (src && !/^https?:\/\//i.test(src)) node.removeAttribute('src');
      // Ensure width/height are numeric
      ['width', 'height'].forEach(attr => {
        const val = node.getAttribute(attr);
        if (val && !/^\d+$/.test(val)) node.removeAttribute(attr);
      });
    }
    // Recursively clean children
    [...node.childNodes].forEach(child => clean(child));
    return node;
  }
  [...tmp.childNodes].forEach(n => clean(n));
  return tmp.innerHTML;
}

// ── Simple text → HTML ────────────────────────────────────
function textToHtml(text) {
  if (!text) return '';
  // Escape HTML entities
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  // Convert double newlines to paragraphs
  return escaped.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// ── Shared nav / header render ─────────────────────────────
function renderHeader(activePage) {
  const user = getCurrentUser();
  const pages = [
    { id: 'home',   label: 'Forum',    href: 'index.html' },
    { id: 'search', label: 'Search',   href: 'search.html' },
  ];

  return `
    <header class="site-header">
      <div class="header-inner">
        <a href="index.html" class="logo">Rikeo<span>.</span></a>
        <nav class="header-nav">
          ${pages.map(p => `<a href="${p.href}" class="nav-link${p.id === activePage ? ' active' : ''}">${p.label}</a>`).join('')}
        </nav>
        <div class="header-search">
          <input type="text" placeholder="Search threads…" id="header-search-input" onkeydown="if(event.key==='Enter')doHeaderSearch()">
          <button onclick="doHeaderSearch()" title="Search" aria-label="Search">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="7" cy="7" r="5"/><path d="m11 11 3 3"/></svg>
          </button>
        </div>
        <div class="header-actions">
          ${user ? '' : `<button class="btn btn-outline btn-sm" id="auth-btn" onclick="showAuthModal('login')">Sign In</button>`}
          ${user ? `
            <a href="create.html" class="btn btn-primary btn-sm" id="create-post-nav">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M8 2v12M2 8h12"/></svg>
              New Post
            </a>
            ${user.role === 'admin' ? `
            <a href="admin.html" class="btn btn-warning btn-sm" title="Admin Panel" style="background:#f59e0b;color:white;">
              ⚙️ Admin
            </a>
            ` : ''}
            <div style="position:relative">
              <button onclick="showNotificationsModal()" title="Notifications" aria-label="Notifications" style="background:none;border:none;color:var(--text);cursor:pointer;font-size:1.1rem;position:relative;">
                🔔
                <span id="notification-badge" class="hidden" style="position:absolute;top:-4px;right:-6px;background:var(--accent);color:white;font-size:0.65rem;padding:2px 5px;border-radius:10px;font-weight:bold;min-width:16px;text-align:center">0</span>
              </button>
            </div>
            <div style="position:relative">
              ${(() => {
                const customPfp = DB.getUserProfilePicture(user.id);
                const isBase64Avatar = user.avatar && user.avatar.startsWith('data:image/');
                if (customPfp) {
                  return `<img src="${customPfp}" alt="${user.displayName}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;cursor:pointer" id="user-avatar-display" onclick="toggleUserMenu()">`;
                } else if (isBase64Avatar) {
                  return `<img src="${user.avatar}" alt="${user.displayName}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;cursor:pointer" id="user-avatar-display" onclick="toggleUserMenu()">`;
                } else {
                  return `<div class="user-avatar" id="user-avatar-display" onclick="toggleUserMenu()" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis">${escapeHtml(user.avatar)}</div>`;
                }
              })()}
              <div id="user-dropdown" class="hidden" style="position:absolute;right:0;top:calc(100% + 8px);background:var(--surface-2);border:1px solid var(--border-mid);min-width:160px;z-index:200;">
                <a href="profile.html" style="display:block;padding:10px 16px;font-size:0.8rem;color:var(--text-secondary);border-bottom:1px solid var(--border);" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--text-secondary)'">Profile</a>
                <button onclick="logout()" style="display:block;width:100%;text-align:left;padding:10px 16px;font-size:0.8rem;color:var(--red);background:none;border:none;cursor:pointer;">Sign Out</button>
              </div>
            </div>
            <div id="user-menu" class="flex-center gap-8"></div>
          ` : ''}
        </div>
      </div>
    </header>
  `;
}

function doHeaderSearch() {
  const q = document.getElementById('header-search-input').value.trim();
  if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
}

function toggleUserMenu() {
  const d = document.getElementById('user-dropdown');
  if (d) d.classList.toggle('hidden');
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    const avatar = document.getElementById('user-avatar-display');
    if (!dropdown.contains(e.target) && e.target !== avatar) {
      dropdown.classList.add('hidden');
    }
  }
});

// ── Render footer ──────────────────────────────────────────
function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-inner">
        <span class="footer-logo">Rikeo<span>.</span>Tech</span>
        <div class="footer-links">
          <a href="index.html" class="footer-link">Forum</a>
          <a href="search.html" class="footer-link">Search</a>
          <a href="profile.html" class="footer-link">Profile</a>
        </div>
        <span class="footer-copy">© ${new Date().getFullYear()} RIKEO</span>
      </div>
    </footer>
  `;
}

// ── Sidebar ────────────────────────────────────────────────
function renderSidebar() {
  const trending = DB.getTrending();
  const stats    = DB.getStats();
  const user     = getCurrentUser();

  return `
    <aside class="side-col">
      ${user ? `
        <div class="widget">
          <div class="widget-title">Your Account</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            ${(() => {
              const customPfp = DB.getUserProfilePicture(user.id);
              const isBase64Avatar = user.avatar && user.avatar.startsWith('data:image/');
              if (customPfp) {
                return `<img src="${customPfp}" alt="${user.displayName}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0">`;
              } else if (isBase64Avatar) {
                return `<img src="${user.avatar}" alt="${user.displayName}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0">`;
              } else {
                return `<div class="author-avatar" style="flex-shrink:0">${escapeHtml(user.avatar)}</div>`;
              }
            })()}
            <div>
              <div style="font-weight:600;font-size:0.85rem">${user.displayName}</div>
              <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--accent)">@${user.username}</div>
            </div>
          </div>
          <a href="create.html" class="btn btn-primary" style="width:100%;justify-content:center">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M8 2v12M2 8h12"/></svg>
            New Post
          </a>
        </div>
      ` : `
        <div class="widget">
          <div class="widget-title">Join the Community</div>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.65">Create an account to post, comment, and join the conversation.</p>
          <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="showAuthModal('register')">Create Account</button>
          <button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px" onclick="showAuthModal('login')">Sign In</button>
        </div>
      `}

      <div class="widget">
        <div class="widget-title">Forum Stats</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${[
            { val: formatNumber(stats.posts),   label: 'Posts' },
            { val: formatNumber(stats.members), label: 'Members' },
            { val: formatNumber(stats.comments),label: 'Comments' },
            { val: formatNumber(stats.views),   label: 'Views' },
          ].map(s => `
            <div style="padding:12px;border:1px solid var(--border)">
              <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;line-height:1">${s.val}</div>
              <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-secondary);margin-top:4px">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="widget">
        <div class="widget-title">Trending</div>
        ${trending.map((p, i) => `
          <a href="post.html?id=${p.id}" class="trending-item" style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);text-decoration:none">
            <span class="trending-num">${String(i+1).padStart(2,'0')}</span>
            <div>
              <div class="trending-title">${escapeHtml(p.title)}</div>
              <div class="trending-meta">${formatNumber(p.views)} views</div>
            </div>
          </a>
        `).join('')}
      </div>

      <div class="widget">
        <div class="widget-title">Categories</div>
        ${DB.CATEGORIES.map(c => `
          <a href="forum.html?cat=${c.id}" class="widget-link">
            <span style="margin-right:8px;color:${c.color}">${c.icon}</span>
            ${c.name}
          </a>
        `).join('')}
      </div>
    </aside>
  `;
}

// ── Escape HTML ────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Strip HTML tags ────────────────────────────────────────
function stripHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || '';
  return escapeHtml(text).slice(0, 160);
}

// ── Extract YouTube ID from URL ────────────────────────────
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Migrate any existing plain-text passwords to hashed before seeding
  DB._migratePasswords();
  DB.seed();
});
