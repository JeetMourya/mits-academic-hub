/**
 * MITS Academic Hub - Admin Authentication
 * Backend JWT login, verification, logout, and inactivity handling.
 */
(function () {
  'use strict';

  const ACCESS_TOKEN_KEY = 'accessToken';
  const REFRESH_TOKEN_KEY = 'refreshToken';
  const ADMIN_PROFILE_KEY = 'adminProfile';
  const ACTIVITY_KEY = 'adminLastActivity';

  function getConfig() {
    return window.MITS_CONFIG?.admin || {};
  }

  function getToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  function readAdminProfile() {
    try {
      const raw = localStorage.getItem(ADMIN_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeAdminProfile(admin) {
    if (admin) localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin));
  }

  function clearAuth() {
    if (window.API?.clearAuth) {
      window.API.clearAuth();
      return;
    }

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_PROFILE_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
  }

  function touchSession() {
    if (getToken()) {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    }
  }

  async function isAuthenticated() {
    if (!getToken() || !window.API?.verifyToken) {
      clearAuth();
      return false;
    }

    const { inactivityTimeoutMs = 15 * 60 * 1000 } = getConfig();
    const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY) || 0);

    if (lastActivity && Date.now() - lastActivity > inactivityTimeoutMs) {
      clearAuth();
      return false;
    }

    const verified = await window.API.verifyToken();

    if (!verified.success) {
      clearAuth();
      return false;
    }

    writeAdminProfile(verified.data?.admin);
    touchSession();
    return true;
  }

  async function login(email, password) {
    if (!window.API?.login || !window.API?.setTokens) {
      return {
        success: false,
        message: 'Authentication service is unavailable.',
      };
    }

    const result = await window.API.login(email, password);

    if (!result.success) {
      clearAuth();
      return {
        success: false,
        message: result.message || 'Invalid email or password',
      };
    }

    window.API.setTokens(result.data.accessToken, result.data.refreshToken);
    writeAdminProfile(result.data.admin);
    touchSession();

    return { success: true, message: result.message || 'Login successful' };
  }

  async function logout() {
    if (window.API?.logout && getToken()) {
      try {
        await window.API.logout();
      } catch {
        clearAuth();
      }
      return;
    }

    clearAuth();
  }

  async function requireAuth(onUnauthenticated) {
    if (await isAuthenticated()) {
      touchSession();
      return true;
    }

    if (typeof onUnauthenticated === 'function') onUnauthenticated();
    return false;
  }

  function initInactivityWatch(onTimeout) {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    let timer = null;

    async function resetTimer() {
      if (!(await isAuthenticated())) return;
      touchSession();
      clearTimeout(timer);
      const { inactivityTimeoutMs = 15 * 60 * 1000 } = getConfig();
      timer = setTimeout(async () => {
        await logout();
        if (typeof onTimeout === 'function') onTimeout();
      }, inactivityTimeoutMs);
    }

    events.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }

  async function updateAdminVisibility() {
    const show = await isAuthenticated();
    const profile = readAdminProfile();

    document.querySelectorAll('[data-admin-only]').forEach((el) => {
      el.hidden = !show;
    });

    document.querySelectorAll('[data-guest-only]').forEach((el) => {
      el.hidden = show;
    });

    const nameEl = document.getElementById('admin-profile-name');
    const avatarEl = document.getElementById('admin-profile-avatar');
    const displayName = profile?.name || profile?.email || 'Admin';

    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
  }

  function isLockedOut() {
    return { locked: false, remainingMs: 0 };
  }

  function formatLockoutTime(ms) {
    const mins = Math.ceil(ms / 60000);
    return mins <= 1 ? '1 minute' : `${mins} minutes`;
  }

  window.MITSAdminAuth = {
    login,
    logout,
    isAuthenticated,
    requireAuth,
    touchSession,
    initInactivityWatch,
    updateAdminVisibility,
    isLockedOut,
    formatLockoutTime,
  };
})();
