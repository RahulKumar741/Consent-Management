(()=> {
  // Keys & helpers
  const K_USERS='ucams_users',K_SESS='ucams_sessions',K_AUDIT='ucams_audit',K_APPS='ucams_applications',K_PAYS='ucams_payments';
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d); const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}"), apps=()=>get(K_APPS,"[]"), pays=()=>get(K_PAYS,"[]"), audit=()=>get(K_AUDIT,"[]");
  const setApps=v=>set(K_APPS,v), setPays=v=>set(K_PAYS,v), setAudit=v=>set(K_AUDIT,v);

  // Guard
  const sess=sessions(); if(!sess.currentUser){location.href='reg-portal.html';return;}
  const key=sess.currentUser, u=users()[key]; if(!u){location.href='reg-portal.html';return;}

  // Elements
  const tbody=document.getElementById('appTbody');
  const fType=document.getElementById('fType'), fStatus=document.getElementById('fStatus'), fSearch=document.getElementById('fSearch'), fClear=document.getElementById('fClear');
  const btnSeed=document.getElementById('btnSeed'), btnNew=document.getElementById('btnNew'), btnExport=document.getElementById('btnExport');
  const btnLogout=document.getElementById('btnLogout');
  const toast=document.getElementById('toast'); const show=t=>{toast.textContent=t;toast.classList.add('show');toast.classList.remove('hidden');setTimeout(()=>{toast.classList.add('hidden');toast.classList.remove('show')},1600)};

  function addAudit(type,meta){ const a=audit(); a.unshift({type,meta,user:key,ts:new Date().toISOString(),ua:navigator.userAgent}); setAudit(a.slice(0,500)); }

  // Seed demo
  function seedIfEmpty(){
    let list=apps().filter(x=>x.user===key);
    if(list.length) return;
    const now=new Date().toISOString();
    list=[
      {id:'CTE-2025-0001', type:'CTE', unit:u.orgName||'My Unit', status:'Draft', user:key, ts:now},
      {id:'CTO-2025-0001', type:'CTO (Air)', unit:u.orgName||'My Unit', status:'Submitted', user:key, ts:now},
      {id:'REN-CTO-2024-0007', type:'Renewal', unit:u.orgName||'My Unit', status:'Approved', user:key, ts:now}
    ].concat(apps());
    setApps(list);
  }

  function badge(s){
    const map={Draft:'#6aa3d2','Submitted':'#2a6fa6','Under Scrutiny':'#2a6fa6','Approved':'#2f7e1d','Rejected':'#d64545','Withdrawn':'#6b7280'};
    return `<span style="display:inline-block;padding:2px 8px;border:1px solid #e6edf3;background:#f7fbff;border-radius:999px;color:${map[s]||'#1f5680'};font-weight:700">${s}</span>`;
  }

  function render(){
    let list=apps().filter(a=>a.user===key);
    const t=(fType?.value||'all').toLowerCase(), s=(fStatus?.value||'all').toLowerCase(), q=(fSearch?.value||'').toLowerCase();
    if(t!=='all') list=list.filter(x=>(x.type||'').toLowerCase().includes(t.replace(' (air)','').replace(' (water)','')));
    if(s!=='all') list=list.filter(x=>(x.status||'').toLowerCase()===s.replace(' ','_').replace('_',' '));
    if(q) list=list.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
    list=list.sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="6" class="cm-muted cm-small" style="text-align:center;">No applications found.</td></tr>`; return; }
    tbody.innerHTML=list.map(a=>{
      const canPay = a.status==='Submitted';
      const canWithdraw = a.status==='Draft' || a.status==='Submitted';
      return `<tr>
        <td class="cm-ellipsis">${a.id}</td>
        <td class="cm-ellipsis">${a.type}</td>
        <td class="cm-ellipsis" title="${a.unit||''}">${a.unit||''}</td>
        <td>${badge(a.status)}</td>
        <td class="cm-ellipsis">${a.ts?new Date(a.ts).toISOString().slice(0,10):'—'}</td>
        <td>
          <button class="cm-btn ghost" data-view="${a.id}">View</button>
          ${canPay?`<button class="cm-btn ghost" data-pay="${a.id}">Pay</button>`:''}
          ${canWithdraw?`<button class="cm-btn ghost" data-withdraw="${a.id}">Withdraw</button>`:''}
          <button class="cm-btn ghost" data-print="${a.id}">Print</button>
        </td>
      </tr>`;
    }).join('');
  }

  // Actions
  tbody.addEventListener('click',e=>{
    const t=e.target; if(!(t instanceof HTMLElement)) return;
    const id=t.dataset.view||t.dataset.pay||t.dataset.withdraw||t.dataset.print; if(!id) return;
    const list=apps(); const a=list.find(x=>x.id===id && x.user===key); if(!a) return;

    if(t.dataset.view){
      alert(`${a.type} (${a.id})\nUnit: ${a.unit||'—'}\nStatus: ${a.status}`);
      addAudit('application_viewed',{id:a.id});
    }
    if(t.dataset.pay){
      // create/ensure a payment record
      const p=pays(); const has=p.find(x=>x.refId===a.id && x.user===key);
      if(!has){ p.unshift({id:`PAY-${Date.now().toString().slice(-6)}`, refId:a.id, refType:a.type, amount:5000, status:'Pending', user:key, createdAt:new Date().toISOString()}); setPays(p); }
      addAudit('payment_initiated',{refId:a.id});
      location.href='payments.html';
    }
    if(t.dataset.withdraw){
      if(!confirm('Withdraw this application?')) return;
      a.status='Withdrawn'; a.ts=new Date().toISOString();
      setApps(list); addAudit('application_withdrawn',{id:a.id}); render(); show('Application withdrawn.');
    }
    if(t.dataset.print){
      const w=window.open('','_blank');
      w?.document.write(`<html><head><title>${a.id}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}</style></head><body>
      <h2>${a.type} <small>(${a.id})</small></h2>
      <table><tr><th>Unit</th><td>${a.unit||'—'}</td></tr><tr><th>Status</th><td>${a.status}</td></tr><tr><th>Updated</th><td>${a.ts||'—'}</td></tr></table>
      <script>setTimeout(()=>print(),100)</script></body></html>`);
      w?.document.close(); addAudit('application_printed',{id:a.id});
    }
  });

  // Top actions & filters
  btnNew?.addEventListener('click',()=>{
    const list=apps(); const id=`CTE-${new Date().getFullYear()}-${Math.floor(1000+Math.random()*9000)}`;
    list.unshift({id, type:'CTE', unit:u.orgName||'My Unit', status:'Draft', user:key, ts:new Date().toISOString()});
    setApps(list); addAudit('application_draft_created',{id}); render(); show('Draft created.');
  });
  btnSeed?.addEventListener('click',()=>{ seedIfEmpty(); render(); show('Demo applications added.'); });
  btnExport?.addEventListener('click',()=>{
    const list=apps().filter(a=>a.user===key);
    const cols=['id','type','unit','status','ts']; const csv=[cols.join(',')].concat(list.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download='applications.csv'; a.click(); URL.revokeObjectURL(url);
  });

  fType?.addEventListener('change',render); fStatus?.addEventListener('change',render); fSearch?.addEventListener('input',render);
  fClear?.addEventListener('click',()=>{fType.value='all'; fStatus.value='all'; fSearch.value=''; render();});
  btnLogout?.addEventListener('click',()=>{const s=sessions(); s.currentUser=null; set(K_SESS,s); location.href='reg-portal.html';});

  // Init
  seedIfEmpty(); render();
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{ if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active'); });
})();
