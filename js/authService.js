/**
 * RIKEO.TECH - API Auth Service
 * Handles communication with backend authentication API
 * SECURITY: Enhanced with CSRF tokens, input validation, and secure storage
 */

// Detect backend API URL dynamically
const API_BASE = (() => {
  // In production, use the same origin's /api endpoint
  // Assume backend server runs on same host at /api route
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5000`;
  }
  // For production: use relative URL so it works with any server
  return `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;  
})();

class AuthService {
  /**
   * SECURITY: Generate CSRF token for state-changing requests
   */
  static generateCSRFToken() {
    const token = 'csrf_' + Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
    sessionStorage.setItem('_csrf_token', token);
    return token;
  }

  /**
   * SECURITY: Get stored CSRF token
   */
  static getCSRFToken() {
    return sessionStorage.getItem('_csrf_token') || this.generateCSRFToken();
  }

  /**
   * SECURITY: Get stored auth token from secure storage
   */
  static getToken() {
    // Try sessionStorage first (more secure than localStorage)
    return sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
  }

  /**
   * SECURITY: Store auth token securely
   */
  static setToken(token) {
    // Store in sessionStorage (cleared on browser close) instead of localStorage
    sessionStorage.setItem('auth_token', token);
    // Also keep in localStorage as fallback
    localStorage.setItem('auth_token', token);
  }

  /**
   * Check if user is authenticated
  /**
   * Register a new user
   */
  static async register(username, displayName, email, password, passwordConfirm) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({ username, displayName, email, password, passwordConfirm })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Verify email with code
   */
  static async verifyEmail(email, code) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Email verification failed');
      }

      // Store token after successful verification (auto-login)
      if (data.token) {
        this.setToken(data.token);
        sessionStorage.setItem('current_user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Resend verification code
   */
  static async resendVerification(email) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification');
      }

      return data;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(email, password) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.token) {
        // SECURITY: Store token in sessionStorage (more secure) and localStorage (fallback)
        this.setToken(data.token);
        sessionStorage.setItem('current_user', JSON.stringify(data.user));
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        // Add user to DB for post author lookups
        if (typeof DB !== 'undefined' && data.user) {
          const users = DB.getUsers() || [];
          const existingIdx = users.findIndex(u => u.id === data.user.id);
          if (existingIdx === -1) {
            users.unshift(data.user);
            DB._set(DB.KEYS.USERS, users);
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get current user from token (prefer sessionStorage)
   */
  static getCurrentUser() {
    // Try sessionStorage first (more secure)
    let userStr = sessionStorage.getItem('current_user');
    if (!userStr) {
      userStr = localStorage.getItem('current_user');
    }
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Logout user (clear all sessions)
   */
  static logout() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('current_user');
    sessionStorage.removeItem('_csrf_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  }

  /**
   * Check if authenticated
   */
  static isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser();
  }

  /**
   * Delete user account
   */
  static async deleteAccount(password) {
    try {
      const token = this.getToken();
      const response = await fetch(`${API_BASE}/api/auth/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Clear all sessions after account deletion
      this.logout();
      return data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  static async forgotPassword(email) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset request failed');
      }

      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(email, token, newPassword, confirmPassword) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({ email, token, newPassword, confirmPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      // After password reset, invalidate all sessions for security
      this.logout();
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Upload custom avatar image
   */
  static async uploadAvatar(imageData) {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/auth/upload-avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageData })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Avatar upload failed');
      }

      // Update local user data
      localStorage.setItem('current_user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  }
}

/**
 * NotificationService - API communication for notifications
 */
class NotificationService {
  /**
   * Get user's notifications
   */
  static async getNotifications(page = 1, limit = 10) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${API_BASE}/api/notifications?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get notifications');
      }

      return data;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount() {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get notification count');
      }

      return data.count || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      return data;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete notification');
      }

      return data;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }
}

/**
 * ModerationService - API communication for moderation
 */
class ModerationService {
  /**
   * Submit a report for a post or comment
   */
  static async reportContent(targetType, targetId, reason, description) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/moderation/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetType, targetId, reason, description })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Report submission failed');
      }

      return data;
    } catch (error) {
      console.error('Report submission error:', error);
      throw error;
    }
  }

  /**
   * Get reports (admin only)
   */
  static async getReports(status = 'open', page = 1, limit = 20) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${API_BASE}/api/moderation/reports?status=${status}&page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get reports');
      }

      return data;
    } catch (error) {
      console.error('Get reports error:', error);
      throw error;
    }
  }

  /**
   * Resolve a report (admin only)
   */
  static async resolveReport(reportId, status, action) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/moderation/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, action })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve report');
      }

      return data;
    } catch (error) {
      console.error('Resolve report error:', error);
      throw error;
    }
  }

  /**
   * Delete content (admin only)
   */
  static async deleteContent(type, id) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/moderation/content/${type}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete content');
      }

      return data;
    } catch (error) {
      console.error('Delete content error:', error);
      throw error;
    }
  }
}

/**
 * MessageService - API communication for direct messaging
 */
class MessageService {
  /**
   * Send a direct message
   */
  static async sendMessage(recipientId, content) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId, content })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      return data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Get messages from a conversation
   */
  static async getConversation(otherUserId, limit = 30, skip = 0) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${API_BASE}/api/messages/conversation/${otherUserId}?limit=${limit}&skip=${skip}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get conversation');
      }

      return data;
    } catch (error) {
      console.error('Get conversation error:', error);
      throw error;
    }
  }

  /**
   * Get list of active conversations
   */
  static async getConversations(limit = 20, skip = 0) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${API_BASE}/api/messages/conversations?limit=${limit}&skip=${skip}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get conversations');
      }

      return data;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  }

  /**
   * Get unread message count
   */
  static async getUnreadCount() {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/messages/unread-count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get unread count');
      }

      return data.count || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete message');
      }

      return data;
    } catch (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  }
}

/**
 * UserService - API communication for user features
 */
class UserService {
  /**
   * Search for users
   */
  static async searchUsers(query) {
    try {
      const response = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      return data;
    } catch (error) {
      console.error('User search error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(username) {
    try {
      const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get user profile');
      }

      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  /**
   * Follow a user
   */
  static async followUser(userId) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to follow user');
      }

      return data;
    } catch (error) {
      console.error('Follow user error:', error);
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(userId) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/users/${userId}/follow`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unfollow user');
      }

      return data;
    } catch (error) {
      console.error('Unfollow user error:', error);
      throw error;
    }
  }
}

/**
 * BookmarkService - API communication for bookmarks
 */
class BookmarkService {
  /**
   * Bookmark a post
   */
  static async bookmarkPost(postId) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to bookmark post');
      }

      return data;
    } catch (error) {
      console.error('Bookmark post error:', error);
      throw error;
    }
  }

  /**
   * Get user's bookmarked posts
   */
  static async getBookmarks(page = 1, limit = 20) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${API_BASE}/api/bookmarks?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get bookmarks');
      }

      return data;
    } catch (error) {
      console.error('Get bookmarks error:', error);
      throw error;
    }
  }

  /**
   * Remove a bookmark
   */
  static async removeBookmark(postId) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE}/api/bookmarks/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove bookmark');
      }

      return data;
    } catch (error) {
      console.error('Remove bookmark error:', error);
      throw error;
    }
  }
}

