/**
 * MITS Academic Hub - Frontend Integration with Backend API
 * Replaces old local-only functionality with cloud API calls
 */

(function () {
  'use strict';

  // Load API client first
  const script = document.createElement('script');
  script.src = 'js/api-client.js';
  document.head.appendChild(script);

  script.onload = function() {
    initFrontendIntegration();
  };

  async function initFrontendIntegration() {
    // Load semesters from API instead of local file
    try {
      const res = await window.API.getSemesters();
      if (res.success) {
        window.SEMESTERS_FROM_API = res.data;
        // Trigger update of semester select
        updateSemesterSelect();
      }
    } catch (error) {
      console.error('Failed to load semesters:', error);
    }
  }

  // Override the loadSemesters function from app.js
  window.loadSemestersOverride = async function() {
    try {
      const res = await window.API.getSemesters();
      if (res.success) {
        return res.data;
      }
      showToast('Failed to load semesters', 'error');
      return [];
    } catch (error) {
      console.error('Semester load error:', error);
      return [];
    }
  };

  // Override the result fetching function
  window.fetchResultsOverride = async function(enrollmentNumber, semesterId) {
    try {
      const res = await window.API.fetchResults(enrollmentNumber, semesterId);
      
      if (!res.success) {
        showToast(res.message || 'Failed to fetch results', 'error');
        return null;
      }

      return res.data;
    } catch (error) {
      console.error('Result fetch error:', error);
      showToast('Network error. Please try again.', 'error');
      return null;
    }
  };

  // Handle admin login redirection to new admin portal
  window.adminLoginRedirect = function() {
    window.location.href = '/admin/';
  };

  window.updateSemesterSelect = function() {
    const select = document.getElementById('semester-select');
    if (!select) return;

    const semesters = window.SEMESTERS_FROM_API || [];
    
    select.innerHTML = '<option value="">Select semester</option>';
    semesters
      .sort((a, b) => (a.semesterNumber || 0) - (b.semesterNumber || 0))
      .forEach((sem) => {
        const opt = document.createElement('option');
        opt.value = sem._id || sem.id;
        opt.textContent = sem.name || sem.label;
        select.appendChild(opt);
      });
  };
})();
