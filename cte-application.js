(() => {
  // ===== Storage helpers =====
  const K_USERS = 'ucams_users';
  const K_SESS  = 'ucams_sessions';
  const K_AUDIT = 'ucams_audit';
  const K_APPS  = 'ucams_applications'; // array of {id,type,status,user,data,ts}
  const get = (k, def) => JSON.parse(localStorage.getItem(k) || def);
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const users    = () => get(K_USERS, "{}");
  const sessions = () => get(K_SESS, "{}");
  const audit    = () => get(K_AUDIT, "[]");
  const apps     = () => get(K_APPS, "[]");
  const setUsers = v => set(K_USERS, v);
  const setAudit = v => set(K_AUDIT, v);
  const setApps  = v => set(K_APPS, v);

  // Draft key per user
  const draftKey = (uid) => `ucams_cte_draft_${uid}`;

  // ===== Toast =====
  const toast = document.getElementById('toast');
  const showToast = (msg, ms=2200) => {
    if (!toast) { alert(msg); return; }
    toast.textContent = msg;
    toast.classList.remove('hidden'); toast.classList.add('show');
    setTimeout(()=>{ toast.classList.remove('show'); toast.classList.add('hidden'); }, ms);
  };

  // ===== Require login =====
  const sess = sessions();
  if (!sess.currentUser) { window.location.href = 'reg-portal.html'; return; }
  const key = sess.currentUser;
  const store = users();
  if (!store[key]) { window.location.href = 'reg-portal.html'; return; }
  const u = store[key];

  // ===== Elements =====
  const form = document.getElementById('cteForm');
  const docInput = document.getElementById('docs');
  const docList  = document.getElementById('docList');
  const btnLogout = document.getElementById('btnLogout');

  // Tabs
  const tabBtns = Array.from(document.querySelectorAll('.cm-tab-btn'));
  const tabs    = Array.from(document.querySelectorAll('.cm-tab'));
  function showTab(id){
    tabs.forEach(t => t.classList.toggle('active', t.id === id));
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    // scroll to top of card when switching sections
    document.querySelector('.cm-scroll')?.scrollTo({top:0, behavior:'smooth'});
  }

  // Next/Back navigation
  const nav = {
    next1:'tab-unit', back2:'tab-applicant', next2:'tab-location',
    back3:'tab-unit', next3:'tab-utilities',
    back4:'tab-location', next4:'tab-waste',
    back5:'tab-utilities', next5:'tab-docs',
    back6:'tab-waste', next6:'tab-declare',
    back7:'tab-docs'
  };
  Object.entries(nav).forEach(([btnId, tabId])=>{
    const el = document.getElementById(btnId);
    if (el) el.addEventListener('click', ()=> showTab(tabId));
  });
  tabBtns.forEach(btn => btn.addEventListener('click', ()=> showTab(btn.dataset.tab)));

  // ===== Prefill from profile / draft =====
  // Input getters
  const g = id => document.getElementById(id);
  const fields = {
    applicantName: g('applicantName'),
    applicantRole: g('applicantRole'),
    applicantEmail: g('applicantEmail'),
    applicantPhone: g('applicantPhone'),
    applicantAddress: g('applicantAddress'),

    industryName: g('industryName'),
    industryCategory: g('industryCategory'),
    industryScale: g('industryScale'),
    sector: g('sector'),
    projectInvestment: g('projectInvestment'),
    capacity: g('capacity'),
    rawMaterials: g('rawMaterials'),
    products: g('products'),

    siteAddress: g('siteAddress'),
    state: g('state'),
    district: g('district'),
    pin: g('pin'),
    latitude: g('latitude'),
    longitude: g('longitude'),

    waterConsumption: g('waterConsumption'),
    wastewater: g('wastewater'),
    powerLoad: g('powerLoad'),
    effluentPlan: g('effluentPlan'),
    airSources: g('airSources'),
    apcSystems: g('apcSystems'),

    hazardousWaste: g('hazardousWaste'),
    solidWaste: g('solidWaste'),
    biomedicalWaste: g('biomedicalWaste'),
    disposalMethod: g('disposalMethod'),

    remarks: g('remarks'),
    agree: g('agree')
  };

  function fillFromProfile() {
    fields.applicantName.value    = u.name || '';
    fields.applicantEmail.value   = u.email || '';
    fields.applicantPhone.value   = u.phone || u.mobile || '';
    fields.applicantAddress.value = u.address || '';
    fields.applicantRole.value    = u.role ? (u.role.charAt(0).toUpperCase()+u.role.slice(1)) : '';
  }

  function fillFromDraft() {
    const draft = get(draftKey(key), "{}");
    if (!draft || !Object.keys(draft).length) return;
    Object.keys(fields).forEach(k=>{
      if (k === 'agree') fields[k].checked = !!draft[k];
      else if (fields[k]) fields[k].value = draft[k] ?? fields[k].value;
    });
    renderDocs(draft._docs || []);
  }

  // ===== Documents =====
  function renderDocs(list){
    const docs = Array.isArray(list) ? list : (get(draftKey(key), "{}")._docs || []);
    if (!docs.length) {
      docList.innerHTML = `<li class="cm-muted cm-small">No documents attached yet.</li>`;
      return;
    }
    docList.innerHTML = docs.map((d,i)=>`
      <li>
        ${d.name} <span class="cm-muted cm-small">(${Math.round((d.size||0)/1024)} KB)</span>
        <button type="button" class="cm-btn ghost" data-remove="${i}" style="margin-left:8px;padding:3px 8px;">Remove</button>
      </li>
    `).join('');
  }
  docList.addEventListener('click', (e)=>{
    const idx = e.target?.dataset?.remove;
    if (idx === undefined) return;
    const d = get(draftKey(key), "{}");
    const arr = d._docs || [];
    arr.splice(parseInt(idx,10),1);
    d._docs = arr;
    set(draftKey(key), d);
    renderDocs(arr);
    addAudit({type:'doc_removed', user:key});
  });

  docInput.addEventListener('change', ()=>{
    const d = get(draftKey(key), "{}");
    const arr = d._docs || [];
    const files = Array.from(docInput.files || []);
    const newDocs = files.map(f => ({ name:f.name, size:f.size, ts:Date.now() }));
    d._docs = [...arr, ...newDocs];
    set(draftKey(key), d);
    renderDocs(d._docs);
    docInput.value = '';
  });

  // ===== Draft (save / load) =====
  function collectData(){
    const data = {};
    Object.keys(fields).forEach(k=>{
      data[k] = k === 'agree' ? !!fields[k].checked : (fields[k].value || '');
    });
    // append docs
    const d = get(draftKey(key), "{}");
    if (d._docs) data._docs = d._docs.slice();
    return data;
  }

  function saveDraft(silent=false){
    const data = collectData();
    set(draftKey(key), data);
    addAudit({type:'cte_draft_saved', user:key});
    if (!silent) showToast('Draft saved.');
  }

  function loadDraft(){
    fillFromProfile();
    fillFromDraft();
  }

  // Quick save buttons
  document.getElementById('btnSaveDraftTop')?.addEventListener('click', ()=> saveDraft(false));
  document.getElementById('btnSaveDraftBottom')?.addEventListener('click', ()=> saveDraft(false));

  // ===== Submit =====
  function requiredOk(){
    const must = [
      'applicantName','applicantEmail','applicantPhone',
      'industryName','industryCategory','siteAddress'
    ];
    for (const id of must){
      const el = fields[id];
      if (!el || !String(el.value).trim()){
        showTab('tab-' + (
          id.startsWith('applicant') ? 'applicant' :
          id.startsWith('industry')  ? 'unit' :
          id.startsWith('site')      ? 'location' : 'applicant'
        ));
        el?.focus();
        showToast('Please fill all required fields.');
        return false;
      }
    }
    if (!fields.agree.checked){
      showTab('tab-declare');
      showToast('Please accept the declaration.');
      return false;
    }
    return true;
  }

  function genId(){
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth()+1).padStart(2,'0');
    const d = String(now.getDate()).padStart(2,'0');
    const seq = Math.floor(Math.random()*9000)+1000;
    return `CTE-${y}${m}${d}-${seq}`;
  }

  function addAudit(e){
    const a = audit();
    a.unshift({...e, ts:new Date().toISOString(), ua:navigator.userAgent});
    setAudit(a.slice(0,500));
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if (!requiredOk()) return;

    // Save current state to ensure docs captured
    saveDraft(true);
    const data = get(draftKey(key), "{}");

    // Create application record
    const id = genId();
    const all = apps();
    all.unshift({
      id, type:'CTE', status:'Submitted', user:key,
      data, ts:new Date().toISOString()
    });
    setApps(all);

    // Clear draft
    localStorage.removeItem(draftKey(key));
    addAudit({type:'cte_submitted', user:key, meta:{id}});

    showToast(`Application submitted (ID: ${id}).`);
    // Optional redirect to applications list:
    // setTimeout(()=> window.location.href = 'applications.html', 800);
  });

  // ===== Reset =====
  document.getElementById('btnReset')?.addEventListener('click', ()=>{
    localStorage.removeItem(draftKey(key));
    Object.values(fields).forEach(el=>{
      if (!el) return;
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });
    renderDocs([]);
    fillFromProfile();
    showTab('tab-applicant');
    showToast('Form reset.');
  });

  // ===== Logout =====
  btnLogout?.addEventListener('click', ()=>{
    const s = sessions(); s.currentUser = null; set(K_SESS, s);
    showToast('Logged out.');
    setTimeout(()=> window.location.href = 'reg-portal.html', 500);
  });

  // ===== Accessibility font buttons =====
  document.querySelectorAll('.cm-acc').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const b = document.body;
      const cur = parseFloat(getComputedStyle(b).fontSize);
      if (btn.textContent === 'A+') b.style.fontSize = (cur+1)+'px';
      if (btn.textContent === 'A')  b.style.fontSize = '16px';
      if (btn.textContent === 'A-') b.style.fontSize = Math.max(12,cur-1)+'px';
    });
  });

  // ===== Init =====
  loadDraft();
  // highlight current top nav
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{
    if (a.getAttribute('href') === location.pathname.split('/').pop()) a.classList.add('active');
  });
})();