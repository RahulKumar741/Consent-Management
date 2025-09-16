(()=> {
  const K_USERS='ucams_users',K_SESS='ucams_sessions',K_AUD='ucams_audit',K_INSP='ucams_inspections',K_COMP='ucams_compliance';
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d), set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}"), audit=()=>get(K_AUD,"[]"), setAudit=v=>set(K_AUD,v);
  const insps=()=>get(K_INSP,"[]"), setInsps=v=>set(K_INSP,v), compl=()=>get(K_COMP,"[]"), setCompl=v=>set(K_COMP,v);
  const sess=sessions(); if(!sess.currentUser){location.href='reg-portal.html';return;} const key=sess.currentUser, u=users()[key]; if(!u){location.href='reg-portal.html';return;}
  const tbody=document.getElementById('inspTbody'), btnSeed=document.getElementById('btnSeed'), toast=document.getElementById('toast'); const show=t=>{toast.textContent=t;toast.classList.add('show');toast.classList.remove('hidden');setTimeout(()=>{toast.classList.add('hidden');toast.classList.remove('show')},1600)};
  function log(type,meta){const a=audit();a.unshift({type,meta,user:key,ts:new Date().toISOString()});setAudit(a.slice(0,500));}
  function seedIfEmpty(){
    const mine=insps().filter(i=>i.user===key); if(mine.length) return;
    const list=insps(); list.unshift(
      {id:'INSP-0001', purpose:'Consent verification', schedule:new Date(Date.now()+5*864e5).toISOString(), status:'Scheduled', user:key}
    ); setInsps(list);
  }
  function badge(s){const map={Scheduled:'#2a6fa6',Acknowledged:'#5fa629','Report Issued':'#6aa3d2','Compliance Pending':'#b06b00',Closed:'#2f7e1d'};return `<span style="display:inline-block;padding:2px 8px;border:1px solid #e6edf3;background:#f7fbff;border-radius:999px;color:${map[s]||'#1f5680'};font-weight:700">${s}</span>`;}
  function render(){
    let list=insps().filter(i=>i.user===key); if(!list.length){tbody.innerHTML=`<tr><td colspan="5" class="cm-muted cm-small" style="text-align:center;">No inspections.</td></tr>`;return;}
    tbody.innerHTML=list.map(i=>`<tr>
      <td>${i.id}</td><td class="cm-ellipsis" title="${i.purpose}">${i.purpose}</td>
      <td>${i.schedule?new Date(i.schedule).toLocaleString(): '—'}</td>
      <td>${badge(i.status||'Scheduled')}</td>
      <td>
        ${i.status==='Scheduled'?`<button class="cm-btn ghost" data-ack="${i.id}">Acknowledge</button>`:''}
        <button class="cm-btn ghost" data-view="${i.id}">View</button>
        ${['Acknowledged','Report Issued','Compliance Pending'].includes(i.status||'')?`<button class="cm-btn ghost" data-upl="${i.id}">Upload Compliance</button>`:''}
        ${i.status!=='Closed'?`<button class="cm-btn ghost" data-close="${i.id}">Mark Closed</button>`:''}
      </td>
    </tr>`).join('');
  }
  tbody.addEventListener('click',e=>{
    const t=e.target; if(!(t instanceof HTMLElement))return;
    const id=t.dataset.ack||t.dataset.view||t.dataset.upl||t.dataset.close; if(!id) return;
    const list=insps(); const i=list.find(x=>x.id===id && x.user===key); if(!i) return;

    if(t.dataset.ack){ i.status='Acknowledged'; setInsps(list); log('inspection_acknowledged',{id:i.id}); render(); show('Inspection acknowledged.'); }
    if(t.dataset.view){ alert(`${i.id}\n${i.purpose}\nSchedule: ${i.schedule ? new Date(i.schedule).toLocaleString() : '—'}\nStatus: ${i.status}`); log('inspection_viewed',{id:i.id}); }
    if(t.dataset.upl){ const c=compl(); c.unshift({id:`COMP-${Date.now().toString().slice(-6)}`, refInsp:i.id, user:key, ts:new Date().toISOString(), note:'Compliance uploaded (demo)'}); setCompl(c); i.status='Compliance Pending'; setInsps(list); log('compliance_uploaded',{inspId:i.id}); render(); show('Compliance uploaded (demo).'); }
    if(t.dataset.close){ i.status='Closed'; setInsps(list); log('inspection_closed',{id:i.id}); render(); show('Inspection closed.'); }
  });
  btnSeed?.addEventListener('click',()=>{seedIfEmpty(); render();});
  document.getElementById('btnLogout')?.addEventListener('click',()=>{const s=sessions(); s.currentUser=null; set(K_SESS,s); location.href='reg-portal.html';});
  seedIfEmpty(); render(); document.querySelectorAll('.cm-nav-list a').forEach(a=>{ if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active'); });
})();