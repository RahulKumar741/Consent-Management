(() => {
  // ===== Storage helpers =====
  const K_USERS = 'ucams_users';
  const K_SESS  = 'ucams_sessions';
  const K_AUDIT = 'ucams_audit';
  const get = (k, def) => JSON.parse(localStorage.getItem(k) || def);
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const users = () => get(K_USERS, "{}");
  const setUsers = v => set(K_USERS, v);
  const sessions = () => get(K_SESS, "{}");
  const setSessions = v => set(K_SESS, v);
  const audit = () => get(K_AUDIT, "[]");
  const setAudit = v => set(K_AUDIT, v);
  const addAudit = (e) => { const a = audit(); a.unshift({...e, ts:new Date().toISOString(), ua:navigator.userAgent}); setAudit(a.slice(0,200)); };

  // ===== Validators =====
  const MOBILE_RE  = /^[6-9]\d{9}$/;
  const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const AADHAAR_RE = /^\d{4}-?\d{4}-?\d{4}$/;
  const PAN_RE     = /^[A-Z]{5}\d{4}[A-Z]$/i;
  const GSTIN_RE   = /^[0-9A-Z]{15}$/i;

  // ===== Toast & accessibility buttons =====
  const toast = document.getElementById('toast');
  const showToast = (msg, ms=2000) => {
    toast.textContent = msg;
    toast.classList.remove('hidden'); toast.classList.add('show');
    setTimeout(()=>{ toast.classList.remove('show'); toast.classList.add('hidden'); }, ms);
  };
  document.querySelectorAll('.cm-acc').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = document.body;
      const cur = parseFloat(getComputedStyle(b).fontSize);
      if (btn.textContent === 'A+') b.style.fontSize = (cur+1)+'px';
      if (btn.textContent === 'A')  b.style.fontSize = '16px';
      if (btn.textContent === 'A-') b.style.fontSize = Math.max(12,cur-1)+'px';
    });
  });

  // ===== Require login =====
  const sess = sessions();
  if (!sess.currentUser) { window.location.href = 'reg-portal.html'; return; }
  const key = sess.currentUser;
  const store = users();
  if (!store[key]) { window.location.href = 'reg-portal.html'; return; }
  const u = store[key];

  // ===== Elements =====
  const profName    = document.getElementById('profName');
  const profPhone   = document.getElementById('profPhone');
  const profEmail   = document.getElementById('profEmail');
  const profAddress = document.getElementById('profAddress');
  const profAadhaar = document.getElementById('profAadhaar');
  const profPAN     = document.getElementById('profPAN');
  const profGSTIN   = document.getElementById('profGSTIN');
  const profLang    = document.getElementById('profLang');
  const profNotify  = document.getElementById('profNotify');
  const profDocs    = document.getElementById('profDocs');
  const docList     = document.getElementById('docList');
  const form        = document.getElementById('profileForm');
  const btnReset    = document.getElementById('btnResetProfile');
  const btnLogout   = document.getElementById('btnLogout');

  // ===== Prefill form (with fallbacks) =====
  function fillForm(){
    // Name
    profName.value    = u.name || '';

    // Phone: read either .phone (profile) OR .mobile (registration)
    profPhone.value   = u.phone || u.mobile || '';

    // Email: read .email; if empty but key looks like an email, show that
    const emailGuess = EMAIL_RE.test(key) ? key : '';
    profEmail.value   = u.email || emailGuess || '';

    // Address & IDs
    profAddress.value = u.address || '';
    profAadhaar.value = u.aadhaar || '';
    profPAN.value     = u.pan || '';
    profGSTIN.value   = u.gstin || '';

    // Preferences
    profLang.value    = u.lang || 'en';
    profNotify.value  = u.notify || 'all';

    renderDocs();
  }

  function renderDocs(){
    const docs = u.docs || [];
    if (!docs.length) {
      docList.innerHTML = `<li class="cm-muted cm-small">No documents uploaded yet.</li>`;
      return;
    }
    docList.innerHTML = docs.map((d,i)=>`
      <li>
        ${d.name} <span class="cm-muted cm-small">(${Math.round((d.size||0)/1024)} KB)</span>
        <button type="button" class="cm-btn ghost" data-remove="${i}" style="margin-left:8px;padding:3px 8px;">Remove</button>
      </li>
    `).join('');
  }

  // Remove document (event delegation)
  docList.addEventListener('click', (e)=>{
    const idx = e.target?.dataset?.remove;
    if (idx === undefined) return;
    const i = parseInt(idx,10);
    const docs = u.docs || [];
    docs.splice(i,1);
    u.docs = docs;
    store[key] = u; setUsers(store);
    addAudit({type:'doc_removed', user:key, meta:{index:i}});
    renderDocs();
    showToast('Document removed.');
  });

  // ===== Save (sync both phone & mobile) =====
  form.addEventListener('submit', (e)=>{
    e.preventDefault();

    const phone = profPhone.value.trim();
    const email = profEmail.value.trim();
    const aad   = profAadhaar.value.trim();
    const pan   = profPAN.value.trim();
    const gst   = profGSTIN.value.trim();

    if (phone && !MOBILE_RE.test(phone)) return showToast('Invalid mobile number.');
    if (email && !EMAIL_RE.test(email))  return showToast('Invalid email.');
    if (aad && !AADHAAR_RE.test(aad))    return showToast('Invalid Aadhaar.');
    if (pan && !PAN_RE.test(pan))        return showToast('Invalid PAN.');
    if (gst && !GSTIN_RE.test(gst))      return showToast('Invalid GSTIN.');

    // Add selected docs (names & sizes only, demo mode)
    const files = Array.from(profDocs.files || []);
    const newDocs = files.map(f => ({ name:f.name, size:f.size, ts:Date.now() }));
    u.docs = [...(u.docs||[]), ...newDocs];

    // Save fields (sync 'phone' and 'mobile' both)
    u.name    = profName.value.trim();
    u.phone   = phone;
    u.mobile  = phone || u.mobile || '';     // keep compatibility with registration
    u.email   = email;
    u.address = profAddress.value.trim();
    u.aadhaar = aad;
    u.pan     = pan.toUpperCase();
    u.gstin   = gst.toUpperCase();
    u.lang    = profLang.value;
    u.notify  = profNotify.value;

    store[key] = u;
    setUsers(store);
    addAudit({type:'profile_updated', user:key});
    renderDocs();
    profDocs.value = '';
    showToast('Profile saved.');
  });

  // ===== Reset fields to saved values =====
  btnReset.addEventListener('click', ()=>{
    fillForm();
    showToast('Reverted to saved profile.');
  });

  // ===== Logout =====
  if (btnLogout) {
    btnLogout.addEventListener('click', ()=>{
      const s = sessions(); s.currentUser = null; setSessions(s);
      showToast('Logged out.');
      setTimeout(()=> window.location.href = 'reg-portal.html', 400);
    });
  }

  // ===== Init =====
  fillForm();

  // Highlight current link in top nav (optional)
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{
    if (a.getAttribute('href') === location.pathname.split('/').pop()) a.classList.add('active');
  });
})();