/* Global theme bootstrap. Runs before first paint so the app never flashes. */
(function () {
  'use strict';
  try {
    var stored = localStorage.getItem('notes:theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
