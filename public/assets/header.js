(function () {
  const root = document.documentElement;
  const btn  = document.getElementById('themeBtn');
  if (!btn) return;

  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(current);

  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const isDark = theme === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.querySelector('.icon').textContent  = isDark ? '🌙' : '🌞';
    btn.querySelector('.label').textContent = isDark ? 'Тёмная тема' : 'Светлая тема';
  }
})();
