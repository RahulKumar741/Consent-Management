(() => {
  // ===== Keys & helpers =====
  const K_USERS='ucams_users', K_SESS='ucams_sessions', K_AUDIT='ucams_audit';
  const K_APPS='ucams_applications', K_AUTHS='ucams_authorizations', K_ACTS='ucams_activities';

  const get = (k, def) => JSON.parse(localStorage.getItem(k) || def);
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}");
  const apps =()=>get(K_APPS,"[]"), auths=()=>get(K_AUTHS,"[]"), acts=()=>get(K_ACTS,"[]");
  const setActs=v=>set(K_ACTS,v), setAudit=v=>set(K_AUDIT,v);
  const audit=()=>get(K_AUDIT,"[]");

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
  const tbody    = document.getElementById('actTbody');
  const fType    = document.getElementById('fType');
  const fStatus  = document.getElementById('fStatus');
  const fSearch  = document.getElementById('fSearch');
  const fClear   = document.getElementById('fClear');
  const btnSeed  = document.getElementById('btnSeed');
  const btnExport= document.getElementById('btnExport');
  const btnLogout= document.getElementById('btnLogout');

  const modal    = document.getElementById('actModal');
  const actClose = document.getElementById('actClose');
  const actDetail= document.getElementById('actDetail');

  const kpiPendingVal = document.getElementById('kpiPendingVal');
  const kpiDueVal     = document.getElementById('kpiDueVal');
  const kpiOverdueVal = document.getElementById('kpiOverdueVal');
  const kpiPaymentsVal= document.getElementById('kpiPaymentsVal');
  const kpiInspectionsVal=document.getElementById('kpiInspectionsVal');

  // ===== Utils =====
  const today = ()=> new Date();
  const inDays = d => Math.round((new Date(d).getTime() - today().getTime()) / (24*3600*1000));
  const fmtDate = d => (d ? new Date(d).toISOString().slice(0,10) : '—');

  const statusBadge = s => {
    const map = {
      pending:'#1f5680', in_progress:'#2a6fa6', awaiting_applicant:'#b06b00',
      completed:'#2f7e1d', overdue:'#a61d1d', rejected:'#6b7280'
    };
    const c = map[s] || '#1f5680';
    const t = s.replace(/_/g,' ').replace(/\b\w/g, m=>m.toUpperCase());
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid #e6edf3;background:#f7fbff;color:${c};font-weight:700;">${t}</span>`;
  };

  function addAudit(evt){
    const a = audit();
    a.unshift({...evt, user:key, ts:new Date().toISOString(), ua:navigator.userAgent});
    setAudit(a.slice(0,500));
  }

  // ===== Build/merge activities from other data =====
  function synthesizeFromAppsAuths(base){
    const list = Array.isArray(base) ? base.slice() : [];
    const myApps = apps().filter(a => a.user === key);
    const myAuth = auths().filter(a => a.user === key);

    // From Applications (e.g., CTE)
    myApps.forEach(a => {
      const id = `ACT-${a.id}`;
      if (list.some(x=>x.id===id)) return;
      let status='in_progress', title='Track application';
      if (a.status === 'Draft'){ status='pending'; title='Complete application draft'; }
      if (a.status === 'Submitted'){ status='in_progress'; title='Application under review'; }
      if (a.status === 'Rejected'){ status='rejected'; title='Application rejected — review remarks'; }
      const dueAt = a.status==='Draft' ? new Date(Date.now()+7*864e5).toISOString() : null;
      list.push({
        id, type:'application', refType:a.type, refId:a.id, title,
        status, createdAt:a.ts || new Date().toISOString(), updatedAt:a.ts || new Date().toISOString(),
        dueAt, priority: (a.status==='Draft' ? 'high':'medium')
      });
    });

    // From Authorizations (renewal reminders)
    myAuth.forEach(A => {
      const days = inDays(A.validTo);
      // Expired or within 60 days -> renewal activity
      if (isFinite(days) && (days <= 60)) {
        const id = `ACT-REN-${A.id}`;
        if (!list.some(x=>x.id===id)) {
          list.push({
            id, type:'application', refType:`Renewal ${A.type}`, refId:A.id,
            title: days < 0 ? `Renew ${A.type} (Expired)` : `Renew ${A.type} (due in ${days} days)`,
            status: days < 0 ? 'overdue' : 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dueAt: A.validTo, priority: days < 7 ? 'high':'medium'
          });
        }
      }
    });

    return list;
  }

  // ===== Seed demo items if empty =====
  function seedIfEmpty(){
    let list = acts().filter(a => a.user === key);
    if (list.length) return;

    const base = [
      {
        id:`ACT-${Date.now().toString().slice(-6)}-PAY`,
        type:'payment', refType:'CTE Fee', refId:'CTE-PAY-001',
        title:'Pay application fee for CTE', status:'pending',
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
        dueAt:new Date(Date.now()+3*864e5).toISOString(), priority:'high'
      },
      {
        id:`ACT-${Date.now().toString().slice(-6)}-INS`,
        type:'inspection', refType:'Site Visit', refId:'INSP-0001',
        title:'Prepare for site inspection', status:'in_progress',
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
        dueAt:new Date(Date.now()+10*864e5).toISOString(), priority:'medium'
      }
    ];
    list = synthesizeFromAppsAuths(base).map(x => ({...x, user:key}));
    setActs((acts().filter(a=>a.user!==key)).concat(list));
  }

  // ===== Render KPIs =====
  function renderKPIs(list){
    const weekFromNow = Date.now() + 7*864e5;
    const pending = list.filter(x => x.status==='pending').length;
    const due = list.filter(x => x.dueAt && x.status!=='completed' && new Date(x.dueAt).getTime() <= weekFromNow && new Date(x.dueAt).getTime() >= Date.now()).length;
    const overdue = list.filter(x => x.dueAt && x.status!=='completed' && new Date(x.dueAt).getTime() < Date.now()).length;
    const payments = list.filter(x => x.type==='payment' && x.status!=='completed').length;
    const inspections = list.filter(x => x.type==='inspection' && x.status!=='completed').length;

    kpiPendingVal.textContent = pending;
    kpiDueVal.textContent = due;
    kpiOverdueVal.textContent = overdue;
    kpiPaymentsVal.textContent = payments;
    kpiInspectionsVal.textContent = inspections;
  }

  // ===== Render table =====
  function render(){
    // Merge stored acts with synthesized (idempotent by ID)
    const stored = acts().filter(a => a.user === key);
    const merged = synthesizeFromAppsAuths(stored);
    // Ensure user field
    const final = merged.map(x => ({...x, user:key}));

    // Persist merged (dedupe by id)
    const byId = {};
    final.forEach(x => { byId[x.id] = x; });
    const saved = Object.values(byId);
    setActs((acts().filter(a=>a.user!==key)).concat(saved));

    // Filters
    const type = (fType?.value || 'all').toLowerCase();
    const stat = (fStatus?.value || 'all').toLowerCase();
    const q    = (fSearch?.value || '').toLowerCase();

    let rows = saved.slice().sort((a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||''));
    if (type !== 'all') rows = rows.filter(r => (r.type||'').toLowerCase() === type);
    if (stat !== 'all') rows = rows.filter(r => (r.status||'').toLowerCase() === stat);
    if (q) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));

    renderKPIs(saved);

    if (!rows.length){
      tbody.innerHTML = `<tr><td colspan="6" class="cm-muted cm-small" style="text-align:center;">No activities found.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(a => {
      const dueTxt = a.dueAt ? fmtDate(a.dueAt) : '—';
      const actions = actionButtons(a);
      return `
        <tr>
          <td class="cm-ellipsis" title="${a.id}">${a.id}</td>
          <td class="td-type cm-ellipsis" title="${a.type}">${a.type.replace(/\b\w/g,c=>c.toUpperCase())}</td>
          <td class="cm-ellipsis" title="${a.title}">${a.title}</td>
          <td class="cm-ellipsis" title="${(a.refType||'')+' '+(a.refId||'')}">${(a.refType||'')}${a.refId?` — ${a.refId}`:''}</td>
          <td class="cm-ellipsis" title="${dueTxt}">${dueTxt}</td>
          <td>
            ${statusBadge(a.status||'pending')}
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
              ${actions}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function actionButtons(a){
    const btn = (label, data) => `<button class="cm-btn ghost" ${data}>${label}</button>`;
    const openTarget = a.refType?.toLowerCase()?.includes('cte') || a.title?.toLowerCase()?.includes('application')
      ? 'cte-application.html' : (a.type==='inspection' ? 'activities.html' : (a.type==='payment' ? 'activities.html' : 'authorizations.html'));

    const arr = [ btn('Open', `data-open="${a.id}" data-url="${openTarget}"`) ];
    if (a.type==='payment' && a.status!=='completed') arr.push(btn('Pay', `data-pay="${a.id}"`));
    if (a.type==='compliance' || a.title?.toLowerCase().includes('upload')) arr.push(btn('Upload', `data-upload="${a.id}"`));
    if (a.type==='inspection') arr.push(btn('Details', `data-view="${a.id}"`));
    if (a.status!=='completed') arr.push(btn('Mark Done', `data-done="${a.id}"`));
    return arr.join('');
  }

  // ===== Actions =====
  tbody.addEventListener('click', (e)=>{
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const id = t.dataset.open || t.dataset.done || t.dataset.view || t.dataset.pay || t.dataset.upload;
    if (!id) return;

    const list = acts(); const a = list.find(x => x.id === id && x.user === key);
    if (!a) return;

    if (t.dataset.open){
      addAudit({type:'activity_opened', meta:{id:a.id, refId:a.refId, refType:a.refType}});
      const url = t.dataset.url || 'dashboard.html';
      window.location.href = url;
    }

    if (t.dataset.view){
      const html = `
        <div style="padding:12px 16px;">
          <div class="cm-row" style="justify-content:space-between;margin-bottom:8px;">
            <div><strong>${a.title}</strong><br><span class="cm-muted">${a.id}</span></div>
            <div>${statusBadge(a.status)}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div><strong>Type</strong><br>${a.type}</div>
            <div><strong>Reference</strong><br>${(a.refType||'')}${a.refId?` — ${a.refId}`:''}</div>
            <div><strong>Created</strong><br>${fmtDate(a.createdAt)}</div>
            <div><strong>Updated</strong><br>${fmtDate(a.updatedAt)}</div>
            <div><strong>Due</strong><br>${fmtDate(a.dueAt)}</div>
            <div><strong>Priority</strong><br>${a.priority || '—'}</div>
          </div>
        </div>
      `;
      actDetail.innerHTML = html;
      modal.classList.remove('hidden');
      addAudit({type:'activity_viewed', meta:{id:a.id}});
    }

    if (t.dataset.pay){
      showToast('Opening payment gateway (demo)…');
      addAudit({type:'payment_initiated', meta:{id:a.id, refId:a.refId}});
      // Demo: mark completed
      setTimeout(()=>{
        a.status = 'completed'; a.updatedAt = new Date().toISOString();
        setActs(list);
        addAudit({type:'payment_completed', meta:{id:a.id, refId:a.refId}});
        render();
        showToast('Payment marked completed (demo).');
      }, 900);
    }

    if (t.dataset.upload){
      showToast('Upload dialog (demo)…');
      addAudit({type:'compliance_upload_opened', meta:{id:a.id}});
    }

    if (t.dataset.done){
      a.status = 'completed'; a.updatedAt = new Date().toISOString();
      setActs(list);
      addAudit({type:'activity_completed', meta:{id:a.id}});
      render();
      showToast('Marked as done.');
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
  actClose?.addEventListener('click', ()=> modal.classList.add('hidden'));
  modal?.addEventListener('click', (e)=>{ if (e.target === modal) modal.classList.add('hidden'); });

  // Seed demo
  function seedDemo(){
    seedIfEmpty();
    render();
    showToast('Demo activities added/updated.');
  }
  btnSeed?.addEventListener('click', seedDemo);

  // Export CSV
  btnExport?.addEventListener('click', ()=>{
    const list = acts().filter(a => a.user === key);
    const cols = ['id','type','title','refType','refId','status','createdAt','updatedAt','dueAt','priority'];
    const csv = [cols.join(',')].concat(list.map(x => cols.map(c => `"${String(x[c]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'activities.csv'; a.click();
    URL.revokeObjectURL(url);
    addAudit({type:'activities_exported', meta:{count:list.length}});
  });

  // Logout
  btnLogout?.addEventListener('click', ()=>{
    const s = sessions(); s.currentUser = null; localStorage.setItem(K_SESS, JSON.stringify(s));
    showToast('Logged out.');
    setTimeout(()=> window.location.href = 'reg-portal.html', 500);
  });

  // Init
  seedIfEmpty();
  render();
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{
    if (a.getAttribute('href') === location.pathname.split('/').pop()) a.classList.add('active');
  });
})();