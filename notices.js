(()=> {
  const K_USERS='ucams_users',K_SESS='ucams_sessions',K_AUD='ucams_audit',K_NOT='ucams_notices';
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d), set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}"), audit=()=>get(K_AUD,"[]"), setAudit=v=>set(K_AUD,v), nots=()=>get(K_NOT,"[]"), setNots=v=>set(K_NOT,v);
  const sess=sessions(); if(!sess.currentUser){location.href='reg-portal.html';return;} const key=sess.currentUser, u=users()[key]; if(!u){location.href='reg-portal.html';return;}
  const tbody=document.getElementById('ntcTbody'), btnSeed=document.getElementById('btnSeed'), toast=document.getElementById('toast'); const show=t=>{toast.textContent=t;toast.classList.add('show');toast.classList.remove('hidden');setTimeout(()=>{toast.classList.add('hidden');toast.classList.remove('show')},1600)};
  function log(type,meta){const a=audit();a.unshift({type,meta,user:key,ts:new Date().toISOString()});setAudit(a.slice(0,500));}
  function seedIfEmpty(){
    const mine=nots().filter(n=>n.user===key); if(mine.length) return;
    const list=nots(); list.unshift({id:'NTC-0001', subject:'Show cause for delayed submission', dueAt:new Date(Date.now()+7*864e5).toISOString(), status:'Issued', user:key});
    setNots(list);
  }
  function badge(s){const map={Issued:'#2a6fa6',Acknowledged:'#5fa629',Responded:'#6aa3d2',Closed:'#2f7e1d'};return `<span style="display:inline-block;padding:2px 8px;border:1px solid #e6edf3;background:#f7fbff;border-radius:999px;color:${map[s]||'#1f5680'};font-weight:700">${s}</span>`;}
  function render(){
    let list=nots().filter(n=>n.user===key);
    if(!list.length){tbody.innerHTML=`<tr><td colspan="5" class="cm-muted cm-small" style="text-align:center;">No notices.</td></tr>`;return;}
    tbody.innerHTML=list.map(n=>`<tr>
      <td>${n.id}</td><td class="cm-ellipsis" title="${n.subject}">${n.subject}</td>
      <td>${n.dueAt?new Date(n.dueAt).toISOString().slice(0,10):'—'}</td>
      <td>${badge(n.status||'Issued')}</td>
      <td>
        ${n.status==='Issued'?`<button class="cm-btn ghost" data-ack="${n.id}">Acknowledge</button>`:''}
        ${n.status!=='Closed'?`<button class="cm-btn ghost" data-reply="${n.id}">Respond</button>`:''}
        <button class="cm-btn ghost" data-dl="${n.id}">Download</button>
      </td>
    </tr>`).join('');
  }
  document.getElementById('btnLogout')?.addEventListener('click',()=>{const s=sessions(); s.currentUser=null; set(K_SESS,s); location.href='reg-portal.html';});
  btnSeed?.addEventListener('click',()=>{seedIfEmpty(); render();});
  tbody.addEventListener('click',e=>{
    const t=e.target; if(!(t instanceof HTMLElement))return;
    const id=t.dataset.ack||t.dataset.reply||t.dataset.dl; if(!id) return;
    const list=nots(); const n=list.find(x=>x.id===id && x.user===key); if(!n) return;

    if(t.dataset.ack){ n.status='Acknowledged'; setNots(list); log('notice_acknowledged',{id:n.id}); render(); show('Acknowledged.'); }
    if(t.dataset.reply){ const resp=prompt('Enter response (demo):'); if(resp){ n.status='Responded'; n.response={text:resp,ts:new Date().toISOString()}; setNots(list); log('notice_response_submitted',{id:n.id}); render(); show('Response submitted.'); } }
    if(t.dataset.dl){ const w=window.open('','_blank'); w?.document.write(`<html><head><title>${n.id}</title><style>body{font-family:sans-serif;padding:20px}</style></head><body><h2>Notice — ${n.id}</h2><p>${n.subject}</p><p>Due: ${n.dueAt||'—'}</p><script>setTimeout(()=>print(),100)</script></body></html>`); w?.document.close(); log('notice_downloaded',{id:n.id}); }
  });

  seedIfEmpty(); render();
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{ if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active'); });
})();