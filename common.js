// common.js
(() => {
  // Map old/alternate filenames to the real one
  const ROUTE_ALIASES = {
    '': 'index.html',
    'reg-portal.html': 'index.html',
    'home.html': 'index.html'
  };

  function norm(pathOrHref){
    if (!pathOrHref) return 'index.html';
    let p = String(pathOrHref).split('#')[0].split('?')[0];
    if (p.endsWith('/')) p += 'index.html';      // folder → index.html
    p = p.split('/').pop().toLowerCase();        // just the filename
    return ROUTE_ALIASES[p] || p;
  }

  function markActive(){
    const current = norm(location.pathname);
    const links = document.querySelectorAll('.cm-nav-list a, .cm-sidenav a');

    // clear any hard-coded actives
    links.forEach(a => a.classList.remove('active'));

    // set active where href matches the current file
    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || /^https?:\/\//i.test(href) || href.startsWith('#')) return; // skip external/hash
      if (norm(href) === current){
        a.classList.add('active');
        a.setAttribute('aria-current','page');
      }
    });
  }

  // Optional: if your HOME link still points to reg-portal.html, fix it
  function fixHomeHref(){
    document.querySelectorAll('.cm-nav-list a').forEach(a=>{
      const txt = (a.textContent||'').trim().toLowerCase();
      if (txt === 'home' && (a.getAttribute('href')||'') === 'reg-portal.html'){
        a.setAttribute('href','index.html');
      }
    });
  }

  function onReady(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(() => {
    fixHomeHref();
    markActive();

    // Optional: shared logout wiring (works if #btnLogout exists)
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout){
      btnLogout.addEventListener('click', () => {
        try {
          const s = JSON.parse(localStorage.getItem('ucams_sessions') || '{}');
          s.currentUser = null;
          localStorage.setItem('ucams_sessions', JSON.stringify(s));
        } catch {}
        location.href = 'index.html';
      });
    }
  });
})();