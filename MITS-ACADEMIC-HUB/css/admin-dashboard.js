/**
 * Admin Dashboard - JavaScript Controller
 */

(function () {
  'use strict';

  let currentAdmin = null;
  let currentSemesters = [];
  let currentStudents = [];

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  async function init() {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      showLoginPage();
      attachLoginListeners();
      return;
    }

    const verified = await API.verifyToken();
    if (verified.success) {
      currentAdmin = verified.data.admin;
      localStorage.setItem('adminProfile', JSON.stringify(currentAdmin));
      showDashboard();
      attachDashboardListeners();
      loadDashboardData();
    } else {
      API.clearAuth();
      showLoginPage();
      attachLoginListeners();
    }
  }

  // ========================================================================
  // UI MANAGEMENT
  // ========================================================================

  function showLoginPage() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('dashboard-container').style.display = 'none';
  }

  function showDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'grid';
    
    const nameEl = document.getElementById('admin-name');
    const avatarEl = document.getElementById('admin-avatar');
    
    if (nameEl) nameEl.textContent = currentAdmin.name || 'Admin';
    if (avatarEl) avatarEl.textContent = (currentAdmin.name || 'A').charAt(0).toUpperCase();
  }

  function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`)?.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-nav="${viewName}"]`)?.classList.add('active');

    const titles = {
      dashboard: 'Dashboard',
      semesters: 'Manage Semesters',
      students: 'Students',
      activity: 'Activity Logs',
      settings: 'Settings',
    };
    document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span class="toast-icon">${type === 'error' ? '✕' : type === 'success' ? '✓' : 'ℹ'}</span>
      <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ========================================================================
  // LOAD DATA
  // ========================================================================

  async function loadDashboardData() {
    try {
      // Load semesters
      const semRes = await API.getAdminSemesters();
      if (semRes.success) {
        currentSemesters = semRes.data;
        document.getElementById('total-semesters').textContent = 
          currentSemesters.filter(s => s.isActive).length;
      }

      // Load activity
      const actRes = await API.getActivityLogs(10);
      if (actRes.success) {
        renderRecentActivity(actRes.data.logs);
      }

      // Load profile
      const profRes = await API.getAdminProfile();
      if (profRes.success) {
        const lastLogin = profRes.data.lastLogin 
          ? new Date(profRes.data.lastLogin).toLocaleDateString()
          : 'Never';
        document.getElementById('last-login').textContent = lastLogin;
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }

  async function loadSemesters() {
    try {
      const res = await API.getAdminSemesters();
      if (res.success) {
        currentSemesters = res.data;
        renderSemesters();
      } else {
        showToast(res.message, 'error');
      }
    } catch (error) {
      showToast('Failed to load semesters', 'error');
    }
  }

  async function loadStudents(search = '') {
    try {
      const res = await API.getStudents(50, 0, search);
      if (res.success) {
        currentStudents = res.data.students;
        renderStudents(currentStudents);
        document.querySelector('.stat-value#total-students').textContent = res.data.pagination.total;
      } else {
        showToast(res.message, 'error');
      }
    } catch (error) {
      showToast('Failed to load students', 'error');
    }
  }

  // ========================================================================
  // RENDER FUNCTIONS
  // ========================================================================

  function renderRecentActivity(logs) {
    const container = document.getElementById('recent-activity');
    
    if (!logs || logs.length === 0) {
      container.innerHTML = '<p class="text-muted">No recent activity</p>';
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="activity-item">
        <div class="activity-icon">${getActivityIcon(log.type)}</div>
        <div class="activity-content">
          <div class="activity-type">${formatActivityType(log.type)}</div>
          <div class="activity-detail">${log.adminEmail}</div>
          <div class="activity-time">${new Date(log.createdAt).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  }

  function renderSemesters() {
    const container = document.getElementById('semesters-list');
    
    if (!currentSemesters || currentSemesters.length === 0) {
      container.innerHTML = '<p class="text-muted">No semesters yet</p>';
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Semester #</th>
            <th>Status</th>
            <th>Results Fetched</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${currentSemesters.map(sem => `
            <tr>
              <td>${sem.name}</td>
              <td>${sem.semesterNumber}</td>
              <td><span class="badge ${sem.isActive ? 'badge-success' : 'badge-gray'}">
                ${sem.isActive ? 'Active' : 'Inactive'}
              </span></td>
              <td>${sem.resultsFetched}</td>
              <td>
                <button type="button" class="btn btn-sm btn-ghost" onclick="editSemester('${sem._id}')">Edit</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="deleteSemester('${sem._id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderStudents(students) {
    const container = document.getElementById('students-list');
    
    if (!students || students.length === 0) {
      container.innerHTML = '<p class="text-muted">No students found</p>';
      return;
    }

    container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Enrollment #</th>
            <th>Name</th>
            <th>Email</th>
            <th>Semesters Searched</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(student => `
            <tr>
              <td>${student.enrollmentNumber}</td>
              <td>${student.name || '-'}</td>
              <td>${student.email || '-'}</td>
              <td>${student.searchHistory.length}</td>
              <td>
                <button type="button" class="btn btn-sm btn-ghost" onclick="viewStudent('${student._id}')">View</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="deleteStudent('${student._id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  function getActivityIcon(type) {
    const icons = {
      admin_login: '🔓',
      admin_logout: '🔒',
      semester_created: '✨',
      semester_updated: '📝',
      semester_deleted: '🗑️',
      result_fetched: '📊',
    };
    return icons[type] || '📋';
  }

  function formatActivityType(type) {
    const types = {
      admin_login: 'Admin Login',
      admin_logout: 'Admin Logout',
      semester_created: 'Semester Created',
      semester_updated: 'Semester Updated',
      semester_deleted: 'Semester Deleted',
      result_fetched: 'Result Fetched',
    };
    return types[type] || type;
  }

  // ========================================================================
  // EVENT LISTENERS - LOGIN
  // ========================================================================

  function attachLoginListeners() {
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorEl = document.getElementById('login-error');

      try {
        const res = await API.login(email, password);
        
        if (res.success) {
          API.setTokens(res.data.accessToken, res.data.refreshToken);
          localStorage.setItem('adminProfile', JSON.stringify(res.data.admin));
          currentAdmin = res.data.admin;
          showDashboard();
          attachDashboardListeners();
          loadDashboardData();
        } else {
          errorEl.textContent = res.message || 'Login failed';
          errorEl.style.display = 'block';
        }
      } catch (error) {
        errorEl.textContent = 'Login failed. Please try again.';
        errorEl.style.display = 'block';
      }
    });
  }

  // ========================================================================
  // EVENT LISTENERS - DASHBOARD
  // ========================================================================

  function attachDashboardListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.nav;
        showView(view);

        if (view === 'semesters') loadSemesters();
        if (view === 'students') loadStudents();
        if (view === 'activity') loadActivityLogs();
        if (view === 'settings') loadSettings();
      });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await API.logout();
      showLoginPage();
      attachLoginListeners();
    });

    // New Semester
    document.getElementById('new-semester-btn')?.addEventListener('click', () => {
      document.getElementById('semester-modal').style.display = 'flex';
    });

    // Semester Form
    document.getElementById('semester-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const data = {
        name: document.getElementById('sem-name').value,
        semesterNumber: parseInt(document.getElementById('sem-number').value),
        resultUrl: document.getElementById('sem-url').value,
        description: document.getElementById('sem-description').value,
      };

      const res = await API.createSemester(data);
      if (res.success) {
        showToast('Semester created successfully', 'success');
        document.getElementById('semester-modal').style.display = 'none';
        document.getElementById('semester-form').reset();
        loadSemesters();
      } else {
        showToast(res.message || 'Failed to create semester', 'error');
      }
    });

    // Settings Form
    document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const data = {
        name: document.getElementById('settings-name').value,
      };

      const res = await API.updateAdminProfile(data);
      if (res.success) {
        showToast('Profile updated successfully', 'success');
        currentAdmin = { ...currentAdmin, ...data };
      } else {
        showToast(res.message || 'Failed to update profile', 'error');
      }
    });

    // Student search
    document.getElementById('student-search')?.addEventListener('input', (e) => {
      loadStudents(e.target.value);
    });

    // Modal close
    document.querySelector('.modal-close')?.addEventListener('click', () => {
      document.getElementById('semester-modal').style.display = 'none';
    });

    document.querySelector('.modal-overlay')?.addEventListener('click', () => {
      document.getElementById('semester-modal').style.display = 'none';
    });
  }

  async function loadActivityLogs() {
    const res = await API.getActivityLogs(100);
    if (res.success) {
      const container = document.getElementById('activity-logs-list');
      const logs = res.data.logs;
      
      container.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td>${formatActivityType(log.type)}</td>
                <td>${log.adminEmail}</td>
                <td><span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">
                  ${log.status}
                </span></td>
                <td>${new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }

  async function loadSettings() {
    const res = await API.getAdminProfile();
    if (res.success) {
      document.getElementById('settings-name').value = res.data.name || '';
      document.getElementById('settings-email').value = res.data.email || '';
    }
  }

  async function deleteSemester(id) {
    if (!confirm('Are you sure you want to delete this semester?')) return;

    const res = await API.deleteSemester(id);
    if (res.success) {
      showToast('Semester deleted successfully', 'success');
      loadSemesters();
    } else {
      showToast(res.message || 'Failed to delete semester', 'error');
    }
  }

  async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student record?')) return;

    const res = await API.deleteStudent(id);
    if (res.success) {
      showToast('Student deleted successfully', 'success');
      loadStudents();
    } else {
      showToast(res.message || 'Failed to delete student', 'error');
    }
  }

  function viewStudent(id) {
    // TODO: Implement view student details
    showToast('View functionality coming soon', 'info');
  }

  // ========================================================================
  // START
  // ========================================================================

  window.addEventListener('DOMContentLoaded', init);

  // Expose functions to global scope
  window.showView = showView;
  window.deleteSemester = deleteSemester;
  window.deleteStudent = deleteStudent;
  window.viewStudent = viewStudent;
  window.editSemester = (id) => showToast('Edit functionality coming soon', 'info');
})();
