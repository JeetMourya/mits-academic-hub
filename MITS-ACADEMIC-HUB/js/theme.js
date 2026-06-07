/**
 * MITS Academic Hub — Theme Manager
 * Handles light/dark mode with system preference and persistence.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mits_theme';
  const root = document.documentElement;

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-preference', theme);

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const icon = btn.querySelector('.theme-icon');
      const label = btn.querySelector('.theme-label');
      if (icon) {
        icon.textContent = resolved === 'dark' ? '☀️' : '🌙';
      }
      if (label) {
        label.textContent = resolved === 'dark' ? 'Light mode' : 'Dark mode';
      }
      btn.setAttribute('aria-label', resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
    applyTheme(theme);
  }

  function toggleTheme() {
    const current = getStoredTheme() || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    const stored = getStoredTheme() || 'dark';
    applyTheme(stored);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!getStoredTheme()) {
        applyTheme('dark');
      }
    });

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggleTheme);
    });
  }

  window.MITSTheme = { init, setTheme, toggleTheme, getStoredTheme };
})();

