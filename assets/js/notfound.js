/*
 * notfound.js: echoes the requested path into the 404 page's fake shell,
 * e.g. "bash: resume.pdf: command not found". textContent only.
 */
(() => {
  'use strict';

  let path;
  try {
    path = decodeURIComponent(window.location.pathname);
  } catch {
    path = window.location.pathname; // malformed escape sequence; show it raw
  }

  path = path.replace(/^\/+/, '');
  if (!path) return;
  if (path.length > 48) path = path.slice(0, 47) + '…';

  document.querySelectorAll('[data-path]').forEach((el) => {
    el.textContent = path;
  });
})();
