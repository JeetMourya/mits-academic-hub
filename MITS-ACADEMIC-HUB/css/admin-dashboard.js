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
        const activeSems = currentSemesters.filter(s => s.isActive);
        document.getElementById('total-semesters').textContent = activeSems.length;
        
        // Calculate total results fetched from all semesters
        const totalResults = currentSemesters.reduce((sum, s) => sum + (s.resultsFetched || 0), 0);
        const resultsFetchedEl = document.getElementById('results-fetched');
        if (resultsFetchedEl) resultsFetchedEl.textContent = totalResults;
      }

      // Load students count
      try {
        const studentRes = await API.getStudents(1, 0, '');
        if (studentRes.success) {
          const totalStudentsEl = document.getElementById('total-students');
          if (totalStudentsEl) totalStudentsEl.textContent = studentRes.data.pagination.total;
        }
      } catch {
        // Students endpoint may fail, ignore
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
    // Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarToggle && sidebar && sidebarOverlay) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
      });

      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
      });
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.nav;
        showView(view);

        // Close sidebar on mobile
        sidebar?.classList.remove('open');
        sidebarOverlay?.classList.remove('open');

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
      document.getElementById('semester-form').reset();
      document.getElementById('edit-sem-id').value = '';
      
      const modalHeader = document.querySelector('#semester-modal .modal-header h2');
      if (modalHeader) modalHeader.textContent = 'New Semester';
      const submitBtn = document.querySelector('#semester-form button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Create Semester';
      
      document.getElementById('semester-modal').style.display = 'flex';
    });

    // Semester Form
    document.getElementById('semester-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const editId = document.getElementById('edit-sem-id').value;
      const data = {
        name: document.getElementById('sem-name').value,
        semesterNumber: parseInt(document.getElementById('sem-number').value),
        resultUrl: document.getElementById('sem-url').value,
        description: document.getElementById('sem-description').value,
      };

      let res;
      if (editId) {
        res = await API.updateSemester(editId, data);
      } else {
        res = await API.createSemester(data);
      }

      if (res.success) {
        showToast(editId ? 'Semester updated successfully' : 'Semester created successfully', 'success');
        document.getElementById('semester-modal').style.display = 'none';
        document.getElementById('semester-form').reset();
        document.getElementById('edit-sem-id').value = '';
        loadSemesters();
      } else {
        showToast(res.message || (editId ? 'Failed to update semester' : 'Failed to create semester'), 'error');
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

    // Student Edit Form
    document.getElementById('student-edit-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('student-edit-id').value;
      const data = {
        name: document.getElementById('student-name').value,
        email: document.getElementById('student-email').value,
        phone: document.getElementById('student-phone').value,
        department: document.getElementById('student-dept').value,
        semester: parseInt(document.getElementById('student-sem').value) || undefined,
      };

      const res = await API.updateStudent(id, data);
      if (res.success) {
        showToast('Student profile updated successfully', 'success');
        document.getElementById('student-modal').style.display = 'none';
        loadStudents(document.getElementById('student-search')?.value || '');
      } else {
        showToast(res.message || 'Failed to update student profile', 'error');
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

  async function viewStudent(id) {
    const summary = currentStudents.find(s => s._id === id);
    if (!summary) {
      showToast('Student not found in list', 'error');
      return;
    }

    showToast('Loading student details...', 'info');
    const res = await API.getStudent(summary.enrollmentNumber);
    if (!res.success) {
      showToast('Failed to load student details', 'error');
      return;
    }

    const student = res.data;

    // Populate edit form
    document.getElementById('student-edit-id').value = student._id;
    document.getElementById('student-enrollment').value = student.enrollmentNumber;
    document.getElementById('student-name').value = student.name || '';
    document.getElementById('student-email').value = student.email || '';
    document.getElementById('student-phone').value = student.phone || '';
    document.getElementById('student-dept').value = student.department || '';
    document.getElementById('student-sem').value = student.semester || '';

    // Render results
    renderStudentResults(student.results);

    // Render history
    renderStudentHistory(student.searchHistory);

    document.getElementById('student-modal').style.display = 'flex';
  }

  function renderStudentResults(results) {
    const container = document.getElementById('student-results-container');
    if (!results || results.length === 0) {
      container.innerHTML = '<p class="text-muted">No fetched results found.</p>';
      return;
    }

    container.innerHTML = results.map(res => `
      <div style="margin-bottom: 1.5rem; border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; background-color: rgba(255, 255, 255, 0.5);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
          <strong style="font-size: 1.1rem; color: #4f46e5;">Semester ${res.semesterNumber}</strong>
          <span style="background-color: #d1fae5; color: #065f46; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.9rem;">SGPA: ${res.sgpa || 'N/A'}</span>
        </div>
        <table class="table" style="font-size: 0.9rem; width: 100%;">
          <thead>
            <tr>
              <th>Code</th>
              <th>Subject</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${res.subjects.map(sub => `
              <tr>
                <td>${sub.code}</td>
                <td>${sub.name}</td>
                <td><span style="font-weight: bold; color: #4f46e5;">${sub.grade}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 0.5rem; text-align: right;">
          Fetched at: ${new Date(res.fetchedAt).toLocaleString()}
        </div>
      </div>
    `).join('');
  }

  function renderStudentHistory(history) {
    const container = document.getElementById('student-history-container');
    if (!history || history.length === 0) {
      container.innerHTML = '<p class="text-muted">No search history found.</p>';
      return;
    }

    container.innerHTML = `
      <table class="table" style="width: 100%;">
        <thead>
          <tr>
            <th>Semester</th>
            <th>Searched Time</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(item => `
            <tr>
              <td>Semester ${item.semesterId}</td>
              <td>${new Date(item.fetchedAt).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function editSemester(id) {
    const sem = currentSemesters.find(s => s._id === id);
    if (!sem) {
      showToast('Semester not found', 'error');
      return;
    }

    document.getElementById('edit-sem-id').value = sem._id;
    document.getElementById('sem-name').value = sem.name || '';
    document.getElementById('sem-number').value = sem.semesterNumber || '';
    document.getElementById('sem-url').value = sem.resultUrl || '';
    document.getElementById('sem-description').value = sem.description || '';

    // Update modal headers & button
    const modalHeader = document.querySelector('#semester-modal .modal-header h2');
    if (modalHeader) modalHeader.textContent = 'Edit Semester';
    const submitBtn = document.querySelector('#semester-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    document.getElementById('semester-modal').style.display = 'flex';
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
  window.editSemester = editSemester;
})();
