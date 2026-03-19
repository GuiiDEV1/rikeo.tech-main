/**
 * RIKEO.TECH - Email Verification Handler
 * Modal for verifying email after registration
 * No external email service - codes shown directly in app
 */

function showEmailVerificationModal(email, userId, verificationCode) {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">Verify Your Email</h2>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Your verification code was shown in the previous message.
      </p>
      
      <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 16px;">A verification code was sent to your email. Enter it below to verify your account.</p>
      
      <div class="form-group mb-16">
        <label class="form-label">Enter Your Verification Code</label>
        <input 
          class="form-input" 
          id="verification-code" 
          placeholder="Enter 6-digit code" 
          maxlength="6"
          style="text-transform: uppercase; font-family: 'Space Mono', monospace; letter-spacing: 2px;"
          autocomplete="off"
        >
      </div>
      
      <p id="verification-error" class="form-error mt-8 hidden"></p>
      
      <button 
        class="btn btn-primary" 
        style="width: 100%; margin-bottom: 12px;" 
        onclick="handleEmailVerification('${email}')"
      >
        Verify Email
      </button>
      
      <button 
        class="btn btn-outline" 
        style="width: 100%; margin-bottom: 12px;" 
        onclick="handleResendVerification('${email}')"
      >
        Get New Code
      </button>
      
      <button 
        class="btn btn-outline" 
        style="width: 100%; color: var(--text-secondary);" 
        onclick="showAuthModal('register')"
      >
        Back to Registration
      </button>
    </div>
  `);

  // Focus on code input
  setTimeout(() => {
    const codeInput = document.getElementById('verification-code');
    if (codeInput) codeInput.focus();
  }, 50);
}

async function handleEmailVerification(email) {
  const code = document.getElementById('verification-code')?.value.trim().toUpperCase() || '';
  const errorEl = document.getElementById('verification-error');

  if (!code) {
    showError(errorEl, 'Please enter the verification code.');
    return;
  }

  if (code.length !== 6) {
    showError(errorEl, 'Code must be 6 characters.');
    return;
  }

  try {
    // Show loading state
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const result = await AuthService.verifyEmail(email, code);

    // If token is returned, automatically log user in
    if (result.token && result.user) {
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('current_user', JSON.stringify(result.user));
      // Add user to DB for post author lookups
      if (typeof DB !== 'undefined' && result.user) {
        const users = DB.getUsers() || [];
        const existingIdx = users.findIndex(u => u.id === result.user.id);
        if (existingIdx === -1) {
          users.unshift(result.user);
          DB._set(DB.KEYS.USERS, users);
        }
      }
    }

    showToast('Email verified! Welcome to Rikeo!', 'success');
    closeModal();

    // Refresh page to complete registration process
    setTimeout(() => { window.location.reload(); }, 1000);
  } catch (error) {
    showError(errorEl, error.message || 'Verification failed. Please try again.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

async function handleResendVerification(email) {
  const errorEl = document.getElementById('verification-error');

  try {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const result = await AuthService.resendVerification(email);

    showToast('New verification code: ' + result.verificationCode, 'success');
    errorEl?.classList.add('hidden');

    // Re-enable after 30 seconds
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
    }, 30000);
  } catch (error) {
    showError(errorEl, error.message || 'Failed to resend code. Try again.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Get New Code';
    }
  }
}
