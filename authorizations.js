(() => {
  // ===== Keys & helpers =====
  const K_USERS = 'ucams_users';
  const K_SESS  = 'ucams_sessions';
  const K_AUDIT = 'ucams_audit';
  const K_AUTHS = 'ucams_authorizations';
  const K_APPS  = 'ucams_applications';

  const get = (k, def) => JSON.parse(localStorage.getItem(k) || def);
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const users    = () => get(K_USERS, "{}");
  const sessions = () => get(K_SESS, "{}");
  const audit    = () => get(K_AUDIT, "[]");
  const auths    = () => get(K_AUTHS, "[]");
  const apps     = () => get(K_APPS, "[]");
  const setAudit = (v) => set(K_AUDIT, v);
  const setAuths = (v) => set(K_AUTHS, v);
  const setApps  = (v) => set(K_APPS, v);

  // ===== Toast =====
  const toast = document.getElementById('toast');
  const showToast = (msg, ms=2000) => {
    if (!toast) { alert(msg); return; }
    toast.textContent = msg;
    toast.classList.remove('hidden'); toast.classList.add('show');
    setTimeout(()=>{ toast.classList.remove('show'); toast.classList.add('hidden'); }, ms);
  };

  // ===== Require login =====
  const sess = sessions();
  if (!sess.currentUser) { window.location.href = 'reg-portal.html'; return; }
  const key = sess.currentUser;
  const udb = users();
  const u = udb[key];
  if (!u) { window.location.href = 'reg-portal.html'; return; }

  // ===== Elements =====
  const tbody    = document.getElementById('authTbody');
  const fType    = document.getElementById('fType');
  const fStatus  = document.getElementById('fStatus');
  const fSearch  = document.getElementById('fSearch');
  const fClear   = document.getElementById('fClear');
  const btnSeed  = document.getElementById('btnSeed');
  const btnLogout= document.getElementById('btnLogout');

  const modal    = document.getElementById('authModal');
  const authClose= document.getElementById('authClose');
  const authDetail = document.getElementById('authDetail');
  const btnPrint = document.getElementById('btnPrint');

  // ===== Audit helper =====
  function addAudit(evt){
    const a = audit();
    a.unshift({...evt, ts:new Date().toISOString(), user:key, ua:navigator.userAgent});
    setAudit(a.slice(0,500));
  }

  // ===== Seed demo (if empty) =====
  function seedIfEmpty(){
    let list = auths();
    if (list.some(x => x.user === key)) return;

    const today = new Date();
    const fmt = d => d.toISOString().slice(0,10);

    const mk = (id, type, unit, from, to, status) => ({
      id, type, unitName: unit, category:'Orange',
      issuingAuthority:'State PCB', issuedOn: fmt(from),
      validFrom: fmt(from), validTo: fmt(to), status,
      conditions:[
        'Comply with all applicable effluent and emission standards.',
        'Submit quarterly self-monitoring reports.',
        'Maintain records of waste generation and disposal.'
      ],
      documents:[{name:'Authorization.pdf'}],
      referenceAppId: null,
      user: key
    });

    const d1 = new Date(today); d1.setMonth(d1.getMonth()-6);
    const d2 = new Date(today); d2.setFullYear(d2.getFullYear()+2);
    const d3 = new Date(today); d3.setFullYear(d3.getFullYear()-1);
    const d4 = new Date(today); d4.setMonth(d4.getMonth()-1);

    list = [
      mk('AUTH-CTE-001', 'CTE', u?.orgName || 'My Unit', d1, d2, 'Active'),
      mk('AUTH-CTO-001', 'CTO (Air)', u?.orgName || 'My Unit', d1, d2, 'Active'),
      mk('AUTH-HW-001', 'Authorization (HW)', u?.orgName || 'My Unit', d3, d4, 'Expired')
    ].concat(list);

    setAuths(list);
  }

  // ===== Render =====
  function statusBadge(s){
    const c = (s==='Active')?'#2f7e1d':(s==='Expired')?'#a61d1d':(s==='Suspended')?'#b06b00':(s==='Revoked')?'#6b7280':'#1f5680';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e6edf3;background:#f7fbff;color:${c};font-weight:700;">${s}</span>`;
  }
  function dateRange(a){
    return `${a.validFrom || '—'} → ${a.validTo || '—'}`;
  }

  function render(){
    const listAll = auths().filter(x => x.user === key);
    const type  = (fType?.value || 'all').toLowerCase();
    const stat  = (fStatus?.value || 'all').toLowerCase();
    const q     = (fSearch?.value || '').toLowerCase();

    let rows = listAll.slice().sort((a,b) => (b.validTo||'').localeCompare(a.validTo||''));
    if (type !== 'all') rows = rows.filter(r => (r.type || '').toLowerCase() === type);
    if (stat !== 'all') rows = rows.filter(r => (r.status || '').toLowerCase() === stat);
    if (q) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));

    if (!rows.length){
      tbody.innerHTML = `<tr><td colspan="6" class="cm-muted cm-small" style="text-align:center;">No authorizations found.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(a => {
      const canRenew = (a.status === 'Active' || a.status === 'Expired');
      const canRevoke = (a.status === 'Active' || a.status === 'Suspended');
      return `
        <tr>
          <td class="cm-ellipsis" title="${a.id}">${a.id}</td>
          <td class="td-type cm-ellipsis" title="${a.type}">${a.type}</td>
          <td class="cm-ellipsis" title="${a.unitName || ''}">${a.unitName || ''}</td>
          <td class="cm-ellipsis" title="${dateRange(a)}">${dateRange(a)}</td>
          <td>${statusBadge(a.status || 'Pending')}</td>
          <td>
            <button class="cm-btn ghost" data-view="${a.id}"   title="View details">View</button>
            <button class="cm-btn ghost" data-dl="${a.id}"     title="Download / Print">Download</button>
            ${canRenew ? `<button class="cm-btn ghost" data-renew="${a.id}" title="Start renewal">Renew</button>` : ``}
            ${canRevoke ? `<button class="cm-btn danger" data-revoke="${a.id}" title="Revoke authorization">Revoke</button>` : ``}
          </td>
        </tr>
      `;
    }).join('');
  }

  // ===== Actions =====
  function openModal(html){
    authDetail.innerHTML = html;
    modal.classList.remove('hidden');
  }
  function closeModal(){ modal.classList.add('hidden'); authDetail.innerHTML = ''; }

  tbody.addEventListener('click', (e)=>{
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const id = t.dataset.view || t.dataset.renew || t.dataset.revoke || t.dataset.dl;
    if (!id) return;

    const list = auths();
    const a = list.find(x => x.id === id && x.user === key);
    if (!a) return;

    if (t.dataset.view){
      const html = `
        <div style="padding:12px 16px;">
          <div class="cm-row" style="justify-content:space-between;margin-bottom:8px;">
            <div><strong>${a.type}</strong> — <span class="cm-muted">${a.id}</span></div>
            <div>${statusBadge(a.status)}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><strong>Unit</strong><br>${a.unitName || '—'}</div>
            <div><strong>Category</strong><br>${a.category || '—'}</div>
            <div><strong>Issuing Authority</strong><br>${a.issuingAuthority || '—'}</div>
            <div><strong>Issued On</strong><br>${a.issuedOn || '—'}</div>
            <div><strong>Validity</strong><br>${dateRange(a)}</div>
            <div><strong>Reference App ID</strong><br>${a.referenceAppId || '—'}</div>
          </div>
          <hr class="cm-divider light">
          <div><strong>Conditions</strong></div>
          <ul style="margin:8px 0 0 18px;">
            ${(a.conditions||[]).map(c=>`<li>${c}</li>`).join('') || '<li class="cm-muted cm-small">—</li>'}
          </ul>
        </div>
      `;
      openModal(html);
      addAudit({type:'auth_viewed', meta:{id:a.id}});
    }

    if (t.dataset.dl){
      // Simple print view
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <html><head><title>${a.id} — ${a.type}</title>
          <style>
            body{font-family:Arial,Helvetica,sans-serif;padding:20px}
            h2{margin:0 0 8px}
            table{width:100%;border-collapse:collapse;margin-top:10px}
            td,th{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}
            small{color:#555}
          </style></head>
          <body>
            <h2>${a.type} <small>(${a.id})</small></h2>
            <table>
              <tr><th>Unit</th><td>${a.unitName || '—'}</td></tr>
              <tr><th>Category</th><td>${a.category || '—'}</td></tr>
              <tr><th>Issuing Authority</th><td>${a.issuingAuthority || '—'}</td></tr>
              <tr><th>Issued On</th><td>${a.issuedOn || '—'}</td></tr>
              <tr><th>Validity</th><td>${dateRange(a)}</td></tr>
              <tr><th>Status</th><td>${a.status || '—'}</td></tr>
              <tr><th>Conditions</th><td><ul>${(a.conditions||[]).map(c=>`<li>${c}</li>`).join('')}</ul></td></tr>
            </table>
            <script>setTimeout(()=>window.print(), 150);</script>
          </body></html>
        `);
        w.document.close();
        addAudit({type:'auth_downloaded', meta:{id:a.id}});
      } else {
        showToast('Popup blocked. Allow popups to print.');
      }
    }

    if (t.dataset.renew){
      // Create a renewal application draft referencing this authorization
      const all = apps();
      const now = new Date().toISOString();
      const appId = `REN-${a.id}-${Date.now().toString().slice(-6)}`;
      all.unshift({
        id: appId,
        type: `Renewal of ${a.type}`,
        status: 'Draft',
        user: key,
        data: { referenceAuthId: a.id, unitName: a.unitName },
        ts: now
      });
      setApps(all);
      addAudit({type:'auth_renewal_started', meta:{authId:a.id, appId}});

      showToast(`Renewal draft created (${appId}).`);
      // Optionally redirect to applications page:
      // setTimeout(()=> window.location.href = 'applications.html', 700);
    }

    if (t.dataset.revoke){
      if (!confirm(`Revoke authorization ${a.id}? This cannot be undone.`)) return;
      a.status = 'Revoked';
      setAuths([...auths().filter(x => !(x.id===a.id && x.user===key)), a]);
      addAudit({type:'auth_revoked', meta:{id:a.id}});
      render();
      showToast(`Authorization ${a.id} revoked.`);
    }
  });

  // Filters
  fType?.addEventListener('change', render);
  fStatus?.addEventListener('change', render);
  fSearch?.addEventListener('input', render);
  fClear?.addEventListener('click', ()=>{
    if (fType) fType.value='all';
    if (fStatus) fStatus.value='all';
    if (fSearch) fSearch.value='';
    render();
  });

  // Modal
  authClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });
  btnPrint?.addEventListener('click', ()=> window.print());

  // Seed
  btnSeed?.addEventListener('click', ()=>{
    seedIfEmpty();
    render();
    showToast('Demo authorizations added.');
  });

  // Logout
  btnLogout?.addEventListener('click', ()=>{
    const s = sessions(); s.currentUser = null; set(K_SESS, s);
    showToast('Logged out.');
    setTimeout(()=> window.location.href = 'reg-portal.html', 500);
  });

  // Init
  seedIfEmpty();   // only adds if none for this user
  render();

  // Highlight current top nav
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{
    if (a.getAttribute('href') === location.pathname.split('/').pop()) a.classList.add('active');
  });
})();