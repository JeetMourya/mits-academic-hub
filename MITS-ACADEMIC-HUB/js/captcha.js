/**
 * MITS Academic Hub — Captcha Module
 * Canvas-based visual captcha with refresh and validation.
 */
(function () {
  'use strict';

  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const LENGTH = 5;

  let currentCode = '';
  let canvas = null;
  let ctx = null;

  function randomChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function generateCode() {
    let code = '';
    for (let i = 0; i < LENGTH; i++) {
      code += randomChar();
    }
    return code;
  }

  function drawCaptcha() {
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, isDark ? '#1a1f2e' : '#f0f4ff');
    bg.addColorStop(1, isDark ? '#252b3d' : '#e8eeff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.strokeStyle = isDark
        ? `rgba(99, 130, 255, ${0.1 + Math.random() * 0.2})`
        : `rgba(79, 110, 247, ${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.lineTo(Math.random() * w, Math.random() * h);
      ctx.stroke();
    }

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = isDark
        ? `rgba(255,255,255,${Math.random() * 0.08})`
        : `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }

    const spacing = w / (LENGTH + 1);
    for (let i = 0; i < currentCode.length; i++) {
      ctx.save();
      ctx.font = `bold ${22 + Math.floor(Math.random() * 6)}px "DM Sans", system-ui, sans-serif`;
      ctx.fillStyle = isDark ? '#c7d2fe' : '#3730a3';
      ctx.translate(spacing * (i + 1), h / 2 + 8);
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.fillText(currentCode[i], -8, 0);
      ctx.restore();
    }
  }

  function refresh() {
    currentCode = generateCode();
    drawCaptcha();
    const input = document.getElementById('captcha-input');
    if (input) {
      input.value = '';
      input.classList.remove('input-error');
    }
    const error = document.getElementById('captcha-error');
    if (error) error.hidden = true;
  }

  function verify(inputValue) {
    if (!inputValue || typeof inputValue !== 'string') return false;
    return inputValue.trim().toUpperCase() === currentCode;
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    refresh();

    const refreshBtn = document.getElementById('captcha-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refresh);
    }

    const observer = new MutationObserver(() => drawCaptcha());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  window.MITSCaptcha = { init, refresh, verify };
})();
