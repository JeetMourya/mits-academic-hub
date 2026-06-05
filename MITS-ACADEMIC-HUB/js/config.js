/**
 * MITS Academic Hub — Central Configuration
 * Edit admin credentials here (single source of truth).
 */
(function () {
  'use strict';

  window.MITS_CONFIG = {
    admin: {
      username: 'admin',
      password: 'mits@hub2025',
      sessionTimeoutMs: 30 * 60 * 1000,
      inactivityTimeoutMs: 15 * 60 * 1000,
      maxLoginAttempts: 5,
      lockoutDurationMs: 15 * 60 * 1000,
    },
    app: {
      name: 'MITS Academic Hub',
      version: '1.1.0',
    },
  };
})();
