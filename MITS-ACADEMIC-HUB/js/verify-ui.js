/**
 * MITS Marksheet Verification - UI enhancements (Phase 3)
 * - Syncs the Regular / Ex segmented control with the original
 *   #exam-type-select (which stays the single source of truth for app.js).
 * - Mobile menu: Escape / outside-click to close, focus return.
 * - Quick-access cards that open a specific calculator tab.
 * No API calls and no data of its own.
 */
(function () {
  'use strict';

  var HELP = {
    Regular: 'Regular and Ex results are stored as separate attempts and never overwrite each other.',
    Ex: 'Ex uses a verified IUMS session. If none is verified for your batch and semester, you will see a clear message instead of a guess.',
  };

  function initExamSegment() {
    var select = document.getElementById('exam-type-select');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-exam-type]'));
    var help = document.getElementById('exam-type-help');
    if (!select || !buttons.length) return;

    function paint() {
      var value = select.value === 'Ex' ? 'Ex' : 'Regular';
      buttons.forEach(function (btn) {
        var on = btn.getAttribute('data-exam-type') === value;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-checked', String(on));
        btn.tabIndex = on ? 0 : -1;
      });
      if (help) help.textContent = HELP[value];
    }

    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        select.value = btn.getAttribute('data-exam-type');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      btn.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = buttons[(i + dir + buttons.length) % buttons.length];
        next.click();
        next.focus();
      });
    });

    select.addEventListener('change', paint);
    paint();
  }

  function initMenu() {
    var toggle = document.getElementById('nav-toggle');
    var menu = document.getElementById('nav-links');
    if (!toggle || !menu) return;

    function close(returnFocus) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      if (returnFocus) toggle.focus();
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(true);
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) close(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960) close(false);
    });
  }

  function initToolShortcuts() {
    document.querySelectorAll('[data-open-tool]').forEach(function (link) {
      link.addEventListener('click', function () {
        var tab = document.querySelector('[data-tool-tab="' + link.getAttribute('data-open-tool') + '"]');
        if (tab) tab.click();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initExamSegment();
    initMenu();
    initToolShortcuts();
  });
})();
