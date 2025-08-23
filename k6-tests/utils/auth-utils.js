// k6-tests/utils/auth-utils.js
// Authentication utilities for k6 load testing

import { httpUtils } from './http-utils.js';
import { generateTestUser } from './data-generators.js';

export class AuthUtils {
  constructor() {
    this.authTokens = new Map();
    this.refreshTokens = new Map();
  }

  /**
   * Generate test users for authentication testing
   */
  generateTestUsers(count = 1000) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(generateTestUser(i));
    }
    return users;
  }

  /**
   * User login with performance tracking
   */
  async login(email, password, userId = null) {
    const payload = JSON.stringify({
      email,
      password,
    });

    const response = httpUtils.post('/auth/login', payload, {}, 'auth_duration');

    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        const token = data.data?.token || data.token;
        const refreshToken = data.data?.refresh_token || data.refresh_token;

        if (token) {
          httpUtils.setAuthToken(token);
          if (userId) {
            this.authTokens.set(userId, token);
            this.refreshTokens.set(userId, refreshToken);
          }
          return { success: true, token, refreshToken };
        }
      } catch (e) {
        console.error('Failed to parse login response:', e);
      }
    }

    return { success: false, error: response.status };
  }

  /**
   * User logout with cleanup
   */
  async logout(userId = null) {
    const response = httpUtils.post('/auth/logout', null, {}, 'auth_duration');

    if (userId) {
      this.authTokens.delete(userId);
      this.refreshTokens.delete(userId);
    }

    return response.status === 200;
  }

  /**
   * Token refresh functionality
   */
  async refreshToken(refreshToken, userId = null) {
    const payload = JSON.stringify({
      refresh_token: refreshToken,
    });

    const response = httpUtils.post('/auth/refresh', payload, {}, 'auth_duration');

    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        const newToken = data.data?.token || data.token;
        const newRefreshToken = data.data?.refresh_token || data.refresh_token;

        if (newToken && userId) {
          this.authTokens.set(userId, newToken);
          this.refreshTokens.set(userId, newRefreshToken);
        }

        return { success: true, token: newToken, refreshToken: newRefreshToken };
      } catch (e) {
        console.error('Failed to parse refresh response:', e);
      }
    }

    return { success: false, error: response.status };
  }

  /**
   * Get user profile
   */
  async getUserProfile() {
    return httpUtils.get('/auth/me', {}, 'auth_duration');
  }

  /**
   * Batch login multiple users for concurrent testing
   */
  async batchLogin(users) {
    const results = [];

    for (const user of users) {
      const result = await this.login(user.email, user.password, user.id);
      results.push({
        userId: user.id,
        success: result.success,
        token: result.token,
      });

      // Small delay between logins to avoid overwhelming the auth system
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return results;
  }

  /**
   * Simulate concurrent user sessions
   */
  async simulateConcurrentSessions(userCount = 100) {
    const users = this.generateTestUsers(userCount);
    const loginResults = await this.batchLogin(users);

    const successfulLogins = loginResults.filter(r => r.success);

    // Simulate active sessions by making periodic requests
    const sessionPromises = successfulLogins.map(async (login) => {
      const sessionDuration = Math.random() * 300000; // Random duration up to 5 minutes
      const endTime = Date.now() + sessionDuration;

      while (Date.now() < endTime) {
        // Set the token for this user's session
        httpUtils.setAuthToken(login.token);

        // Make a random request to simulate user activity
        await this.getUserProfile();

        // Random delay between requests (1-30 seconds)
        const delay = 1000 + Math.random() * 29000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    });

    return Promise.allSettled(sessionPromises);
  }

  /**
   * Test token expiration and refresh flow
   */
  async testTokenLifecycle(userId) {
    const loginResult = await this.login(`test${userId}@example.com`, 'password123', userId);

    if (!loginResult.success) {
      return { success: false, error: 'Initial login failed' };
    }

    // Simulate token expiration by waiting
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Try to use the potentially expired token
    httpUtils.setAuthToken(loginResult.token);
    const profileResponse = await this.getUserProfile();

    if (profileResponse.status === 401) {
      // Token expired, try refresh
      const refreshResult = await this.refreshToken(loginResult.refreshToken, userId);

      if (refreshResult.success) {
        // Use new token
        httpUtils.setAuthToken(refreshResult.token);
        const newProfileResponse = await this.getUserProfile();
        return {
          success: true,
          tokenRefreshed: true,
          finalStatus: newProfileResponse.status,
        };
      } else {
        return { success: false, error: 'Token refresh failed' };
      }
    }

    return { success: true, tokenRefreshed: false, finalStatus: profileResponse.status };
  }

  /**
   * Get stored token for a user
   */
  getToken(userId) {
    return this.authTokens.get(userId);
  }

  /**
   * Get stored refresh token for a user
   */
  getRefreshToken(userId) {
    return this.refreshTokens.get(userId);
  }

  /**
   * Clear all stored tokens
   */
  clearAllTokens() {
    this.authTokens.clear();
    this.refreshTokens.clear();
  }
}

// Export singleton instance
export const authUtils = new AuthUtils();