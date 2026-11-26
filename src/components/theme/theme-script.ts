/**
 * Runs before React hydrates so the page never flashes the wrong theme.
 * Uses the saved choice, otherwise the visitor's OS setting.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
