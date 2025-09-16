(() => {
  // Helpers
  const get = (k, def) => JSON.parse(localStorage.getItem(k) || def);
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const users    = () => get('ucams_users', '{}');
  const sessions = () => get('ucams_sessions', '{}');
  const audit    = () => get('ucams_audit', '[]');

  // Guard with graceful fallback (no white screen)
  let key = null, u = null;
  try {
    const sess = sessions();
    key = sess.currentUser;
    u = key ? users()[key] : null;
  } catch {}
  const tbodyFallback = () => {
    const tb = document.getElementById('auditTbody');
    if (tb) tb.innerHTML = `<tr><td colspan="4">Please <a href="reg-portal.html">log in</a> to view your audit logs.</td></tr>`;
  };
  if (!key || !u) { tbodyFallback(); return; }

  // Elements
  const tbody     = document.getElementById('auditTbody');
  const fType     = document.getElementById('fType');
  const fSearch   = document.getElementById('fSearch');
  const fClear    = document.getElementById('fClear');
  const btnLogout = document.getElementById('btnLogout');

  // Toast (optional)
  const toast = document.getElementById('toast');
  const showToast = (msg, ms=2000) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden'); toast.classList.add('show');
    setTimeout(()=>{ toast.classList.remove('show'); toast.classList.add('hidden'); }, ms);
  };

  // Data
  const all  = audit();
  const mine = all.filter(x => x.user === key);

  const fmtType = (t='') => t.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
  const fmtTime = (iso)  => { try { return new Date(iso).toLocaleString(); } catch { return iso||''; } };

  function render() {
    if (!tbody) return;

    const type = (fType?.value || 'all').toLowerCase();
    const q    = (fSearch?.value || '').toLowerCase();

    let rows = mine.slice().sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
    if (type !== 'all') rows = rows.filter(r => (r.type||'').toLowerCase() === type);
    if (q) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));

    if (!rows.length) {
      // Keep table structure, just show an empty message row (widths remain frozen by colgroup)
      tbody.innerHTML = `<tr><td colspan="4" class="cm-muted cm-small">No matching log entries.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const typeText = fmtType(r.type || '');
      const ua = r.ua || '';
      return `
        <tr>
          <td class="cm-ellipsis" title="${fmtTime(r.ts)}">${fmtTime(r.ts)}</td>
          <td class="td-type cm-ellipsis" title="${typeText}">${typeText}</td>
          <td class="cm-ellipsis" title="${r.user}">${r.user}</td>
          <td class="td-device cm-ellipsis" title="${ua}">${ua}</td>
        </tr>
      `;
    }).join('');
  }

  // Events
  fType?.addEventListener('change', render);
  fSearch?.addEventListener('input', render);
  fClear?.addEventListener('click', () => { if (fType) fType.value='all'; if (fSearch) fSearch.value=''; render(); });

  btnLogout?.addEventListener('click', () => {
    const s = sessions(); s.currentUser = null; set('ucams_sessions', s);
    showToast('Logged out.');
    setTimeout(()=> window.location.href = 'reg-portal.html', 500);
  });

  // Init
  render();

  // Highlight current top nav (nice-to-have)
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{
    if (a.getAttribute('href') === location.pathname.split('/').pop()) a.classList.add('active');
  });
})();