/**
 * MITS Academic Hub - API Client
 * Frontend API communication layer
 */

class APIClient {
  constructor() {
    this.baseURL = window.location.origin === 'http://localhost:3000'
      ? 'http://localhost:3000/api'
      : `${window.location.origin}/api`;
    
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  // ========================================================================
  // CORE REQUEST METHOD
  // ========================================================================

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      requiresAuth = false,
    } = options;

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (requiresAuth && this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : null,
      });

      // Handle 401 - Token expired
      if (response.status === 401 && this.refreshToken && requiresAuth) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          requestHeaders.Authorization = `Bearer ${this.accessToken}`;
          return fetch(`${this.baseURL}${endpoint}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : null,
          }).then(r => r.json());
        }
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
      };
    }
  }

  // ========================================================================
  // TOKEN MANAGEMENT
  // ========================================================================

  async refreshAccessToken() {
    try {
      const response = await this.request('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: this.refreshToken },
      });

      if (response.success && response.data?.accessToken) {
        this.accessToken = response.data.accessToken;
        localStorage.setItem('accessToken', this.accessToken);
        if (response.data.refreshToken) {
          this.refreshToken = response.data.refreshToken;
          localStorage.setItem('refreshToken', this.refreshToken);
        }
        return true;
      }

      this.clearAuth();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('adminProfile');
    localStorage.removeItem('adminLastActivity');
  }

  // ========================================================================
  // AUTHENTICATION
  // ========================================================================

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async logout() {
    await this.request('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
    });
    this.clearAuth();
  }

  async verifyToken() {
    return this.request('/auth/verify', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  // ========================================================================
  // RESULTS
  // ========================================================================

  async fetchResults(enrollmentNumber, semesterId) {
    return this.request('/results/fetch', {
      method: 'POST',
      body: { enrollmentNumber, semesterId },
    });
  }

  async getSemesters() {
    return this.request('/results/semesters', {
      method: 'GET',
    });
  }

  async getActiveSemesters() {
    return this.request('/semesters/active', {
      method: 'GET',
    });
  }

  // ========================================================================
  // ADMIN
  // ========================================================================

  async getAdminProfile() {
    return this.request('/admin/profile', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  async updateAdminProfile(data) {
    return this.request('/admin/profile', {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    });
  }

  // ========================================================================
  // ADMIN - SEMESTERS
  // ========================================================================

  async getAdminSemesters() {
    return this.request('/admin/semesters', {
      method: 'GET',
      requiresAuth: true,
    });
  }

  async createSemester(data) {
    return this.request('/admin/semesters', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  }

  async updateSemester(id, data) {
    return this.request(`/admin/semesters/${id}`, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    });
  }

  async deleteSemester(id) {
    return this.request(`/admin/semesters/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  // ========================================================================
  // ADMIN - ACTIVITY LOGS
  // ========================================================================

  async getActivityLogs(limit = 50, skip = 0) {
    return this.request(`/admin/activity-logs?limit=${limit}&skip=${skip}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  // ========================================================================
  // STUDENTS (Admin)
  // ========================================================================

  async getStudents(limit = 50, skip = 0, search = '') {
    const query = new URLSearchParams({ limit, skip, search }).toString();
    return this.request(`/students?${query}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  async getStudent(enrollmentNumber) {
    return this.request(`/students/${enrollmentNumber}`, {
      method: 'GET',
      requiresAuth: true,
    });
  }

  async deleteStudent(id) {
    return this.request(`/students/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }
}

// Export singleton instance
window.API = new APIClient();
