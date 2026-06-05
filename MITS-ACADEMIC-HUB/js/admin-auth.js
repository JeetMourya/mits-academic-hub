/**
 * MITS Academic Hub — Admin Authentication
 * Session-based login with inactivity timeout and brute-force protection.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'mits_admin_session';
  const LOCKOUT_KEY = 'mits_admin_lockout';

  function getConfig() {
    return window.MITS_CONFIG?.admin || {};
  }

  function generateToken() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function readLockout() {
    try {
      const raw = localStorage.getItem(LOCKOUT_KEY);
      return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
    } catch {
      return { attempts: 0, lockedUntil: null };
    }
  }

  function writeLockout(data) {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
  }

  function isLockedOut() {
    const lockout = readLockout();
    if (!lockout.lockedUntil) return { locked: false, remainingMs: 0 };
    const remaining = lockout.lockedUntil - Date.now();
    if (remaining > 0) return { locked: true, remainingMs: remaining };
    writeLockout({ attempts: 0, lockedUntil: null });
    return { locked: false, remainingMs: 0 };
  }

  function formatLockoutTime(ms) {
    const mins = Math.ceil(ms / 60000);
    return mins <= 1 ? '1 minute' : `${mins} minutes`;
  }

  function isSessionValid(session) {
    if (!session?.token || !session?.expiresAt) return false;
    return Date.now() < session.expiresAt;
  }

  function isAuthenticated() {
    const session = readSession();
    if (!isSessionValid(session)) {
      if (session) clearSession();
      return false;
    }

    const { inactivityTimeoutMs = 15 * 60 * 1000 } = getConfig();
    const inactiveMs = Date.now() - (session.lastActivity || session.createdAt || 0);
    if (inactiveMs > inactivityTimeoutMs) {
      clearSession();
      return false;
    }

    return true;
  }

  function touchSession() {
    const session = readSession();
    if (!session) return;
    session.lastActivity = Date.now();
    writeSession(session);
  }

  function login(username, password) {
    const config = getConfig();
    const lockoutCheck = isLockedOut();
    if (lockoutCheck.locked) {
      return {
        success: false,
        message: `Too many failed attempts. Try again in ${formatLockoutTime(lockoutCheck.remainingMs)}.`,
      };
    }

    const validUser = String(username).trim() === config.username;
    const validPass = String(password) === config.password;

    if (!validUser || !validPass) {
      const lockout = readLockout();
      lockout.attempts += 1;
      const maxAttempts = config.maxLoginAttempts || 5;

      if (lockout.attempts >= maxAttempts) {
        lockout.lockedUntil = Date.now() + (config.lockoutDurationMs || 15 * 60 * 1000);
        lockout.attempts = 0;
        writeLockout(lockout);
        return {
          success: false,
          message: `Account locked for ${formatLockoutTime(config.lockoutDurationMs || 15 * 60 * 1000)} due to repeated failures.`,
        };
      }

      writeLockout(lockout);
      const remaining = maxAttempts - lockout.attempts;
      return {
        success: false,
        message: `Invalid credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      };
    }

    writeLockout({ attempts: 0, lockedUntil: null });

    const now = Date.now();
    writeSession({
      token: generateToken(),
      username: config.username,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + (config.sessionTimeoutMs || 30 * 60 * 1000),
    });

    return { success: true, message: 'Login successful' };
  }

  function logout() {
    clearSession();
  }

  function requireAuth(onUnauthenticated) {
    if (isAuthenticated()) {
      touchSession();
      return true;
    }
    if (typeof onUnauthenticated === 'function') onUnauthenticated();
    return false;
  }

  function initInactivityWatch(onTimeout) {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    let timer = null;

    function resetTimer() {
      if (!isAuthenticated()) return;
      touchSession();
      clearTimeout(timer);
      const { inactivityTimeoutMs = 15 * 60 * 1000 } = getConfig();
      timer = setTimeout(() => {
        logout();
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

  function updateAdminVisibility() {
    const show = isAuthenticated();
    const session = readSession();

    document.querySelectorAll('[data-admin-only]').forEach((el) => {
      el.hidden = !show;
    });

    document.querySelectorAll('[data-guest-only]').forEach((el) => {
      el.hidden = show;
    });

    const nameEl = document.getElementById('admin-profile-name');
    const avatarEl = document.getElementById('admin-profile-avatar');
    const username = session?.username || getConfig().username || 'Admin';

    if (nameEl) nameEl.textContent = username;
    if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
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
