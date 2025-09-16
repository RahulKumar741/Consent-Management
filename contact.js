(() => {
  // Keys and helpers
  const K_USERS='ucams_users', K_SESS='ucams_sessions', K_AUD='ucams_audit', K_CONTACT='ucams_contact_msgs';
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d);
  const set=(k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const sessions=()=>get(K_SESS,"{}"), users=()=>get(K_USERS,"{}"), msgs=()=>get(K_CONTACT,"[]");
  const setMsgs=v=>set(K_CONTACT,v), audit=()=>get(K_AUD,"[]"), setAudit=v=>set(K_AUD,v);

  // Require login (to keep portal consistent)
  const sess=sessions(); if(!sess.currentUser){ location.href='reg-portal.html'; return; }
  const key=sess.currentUser, u=users()[key]; if(!u){ location.href='reg-portal.html'; return; }

  // Elements
  const form=document.getElementById('contactForm');
  const nameEl=document.getElementById('cname');
  const emailEl=document.getElementById('cemail');
  const phoneEl=document.getElementById('cphone');
  const msgEl=document.getElementById('cmsg');
  const countEl=document.getElementById('wordCount');
  const limitNote=document.getElementById('limitNote');
  const submitBtn=document.getElementById('btnSubmit');
  const toast=document.getElementById('toast');
  const show=t=>{toast.textContent=t; toast.classList.add('show'); toast.classList.remove('hidden'); setTimeout(()=>{toast.classList.add('hidden'); toast.classList.remove('show')},1600)};

  // Prefill from profile when available
  if (u.name)  nameEl.value = u.name;
  if (u.email) emailEl.value = u.email;
  if (u.phone) phoneEl.value = (u.phone+'').replace(/\D/g,'').slice(-10);

  // Word counter with hard cap 300 words
  const MAX_WORDS = 300;
  function countWords(text){
    const words = text.trim().split(/\s+/).filter(Boolean);
    return {count: words.length, words};
  }
  function enforceWordLimit(){
    const {count, words} = countWords(msgEl.value);
    if (count > MAX_WORDS){
      // Trim to 300 words
      msgEl.value = words.slice(0, MAX_WORDS).join(' ');
      countEl.textContent = MAX_WORDS.toString();
      limitNote.textContent = 'Word limit reached.';
    } else {
      countEl.textContent = count.toString();
      limitNote.textContent = `${MAX_WORDS - count} words remaining`;
    }
    submitBtn.disabled = !form.checkValidity();
  }
  msgEl.addEventListener('input', enforceWordLimit);
  enforceWordLimit();

  // Simple phone validation (10 digits)
  phoneEl.addEventListener('input', () => {
    phoneEl.value = phoneEl.value.replace(/\D/g,'').slice(0,10);
  });

  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const payload = {
      id: `CNT-${Date.now().toString().slice(-6)}`,
      user: key,
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      phone: phoneEl.value.trim(),
      message: msgEl.value.trim(),
      ts: new Date().toISOString()
    };

    const list = msgs();
    list.unshift(payload);
    setMsgs(list.slice(0,500)); // keep last 500
    const aud = audit(); 
    aud.unshift({type:'contact_submitted', user:key, ts:payload.ts, meta:{id:payload.id}});
    setAudit(aud.slice(0,500));

    show('Message submitted. We will get back to you.');
    form.reset();
    enforceWordLimit();
  });

  // Logout & active nav
  document.getElementById('btnLogout')?.addEventListener('click', ()=>{
    const s=sessions(); s.currentUser=null; set(K_SESS,s);
    location.href='reg-portal.html';
  });
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{
    if(a.getAttribute('href') === location.pathname.split('/').pop()) a.classList.add('active');
  });
})();
