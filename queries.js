(()=> {
  const K_USERS='ucams_users',K_SESS='ucams_sessions',K_AUD='ucams_audit',K_QRY='ucams_queries';
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d), set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}"), audit=()=>get(K_AUD,"[]"), setAudit=v=>set(K_AUD,v), qrys=()=>get(K_QRY,"[]"), setQrys=v=>set(K_QRY,v);
  const sess=sessions(); if(!sess.currentUser){location.href='reg-portal.html';return;} const key=sess.currentUser, u=users()[key]; if(!u){location.href='reg-portal.html';return;}
  const tbody=document.getElementById('qryTbody'), fStatus=document.getElementById('fStatus'), fSearch=document.getElementById('fSearch'), fClear=document.getElementById('fClear'), btnSeed=document.getElementById('btnSeed'), toast=document.getElementById('toast');
  const modal=document.getElementById('qryModal'), qryClose=document.getElementById('qryClose'), qryResp=document.getElementById('qryResp'), qrySubmit=document.getElementById('qrySubmit');
  let currentId=null; const show=t=>{toast.textContent=t;toast.classList.add('show');toast.classList.remove('hidden');setTimeout(()=>{toast.classList.add('hidden');toast.classList.remove('show')},1600)};
  function log(type,meta){const a=audit();a.unshift({type,meta,user:key,ts:new Date().toISOString()});setAudit(a.slice(0,500));}

  function seedIfEmpty(){
    const mine=qrys().filter(q=>q.user===key); if(mine.length) return;
    const list=qrys(); list.unshift(
      {id:'QRY-0001', title:'Clarify water source details', refId:'CTE-2025-0001', status:'Awaiting Applicant', user:key, thread:[]}
    ); setQrys(list);
  }
  function badge(s){const map={'Awaiting Applicant':'#b06b00','Submitted':'#2a6fa6','Resolved':'#2f7e1d'};return `<span style="display:inline-block;padding:2px 8px;border:1px solid #e6edf3;background:#f7fbff;border-radius:999px;color:${map[s]||'#1f5680'};font-weight:700">${s}</span>`;}

  function render(){
    let list=qrys().filter(q=>q.user===key);
    const s=(fStatus.value||'all').toLowerCase(), q=(fSearch.value||'').toLowerCase();
    if(s!=='all') list=list.filter(x=>(x.status||'').toLowerCase()===s);
    if(q) list=list.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
    if(!list.length){tbody.innerHTML=`<tr><td colspan="5" class="cm-muted cm-small" style="text-align:center;">No queries.</td></tr>`; return;}
    tbody.innerHTML=list.map(x=>`<tr>
      <td>${x.id}</td><td class="cm-ellipsis" title="${x.title}">${x.title}</td>
      <td>${x.refId||'—'}</td><td>${badge(x.status)}</td>
      <td>
        <button class="cm-btn ghost" data-view="${x.id}">View</button>
        ${x.status==='Awaiting Applicant'?`<button class="cm-btn primary" data-reply="${x.id}">Respond</button>`:''}
      </td>
    </tr>`).join('');
  }

  tbody.addEventListener('click',e=>{
    const t=e.target; if(!(t instanceof HTMLElement))return;
    const id=t.dataset.view||t.dataset.reply; if(!id) return;
    const list=qrys(); const q=list.find(r=>r.id===id && r.user===key); if(!q) return;

    if(t.dataset.view){ alert(`${q.id}\n${q.title}\nRef: ${q.refId||'—'}\nStatus: ${q.status}`); log('query_viewed',{id:q.id}); }
    if(t.dataset.reply){ currentId=id; qryResp.value=''; modal.classList.remove('hidden'); }
  });

  qryClose?.addEventListener('click',()=>modal.classList.add('hidden'));
  modal?.addEventListener('click',e=>{ if(e.target===modal) modal.classList.add('hidden'); });
  qrySubmit?.addEventListener('click',()=>{
    const txt=qryResp.value.trim(); if(!txt) return;
    const list=qrys(); const q=list.find(r=>r.id===currentId && r.user===key); if(!q) return;
    q.thread=q.thread||[]; q.thread.push({by:'applicant', ts:new Date().toISOString(), text:txt});
    q.status='Submitted'; setQrys(list); log('query_response_submitted',{id:q.id}); modal.classList.add('hidden'); render(); show('Response submitted.');
  });

  fStatus.addEventListener('change',render); fSearch.addEventListener('input',render); fClear.addEventListener('click',()=>{fStatus.value='all'; fSearch.value=''; render();});
  document.getElementById('btnLogout')?.addEventListener('click',()=>{const s=sessions(); s.currentUser=null; set(K_SESS,s); location.href='reg-portal.html';});

  seedIfEmpty(); render();
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{ if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active'); });
})();
