(()=> {
  const K_USERS='ucams_users',K_SESS='ucams_sessions',K_AUD='ucams_audit',K_PAYS='ucams_payments';
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d), set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}"), pays=()=>get(K_PAYS,"[]"), setPays=v=>set(K_PAYS,v), aud=()=>get(K_AUD,"[]"), setAud=v=>set(K_AUD,v);
  const sess=sessions(); if(!sess.currentUser){location.href='reg-portal.html';return;}
  const key=sess.currentUser, u=users()[key]; if(!u){location.href='reg-portal.html';return;}
  const tbody=document.getElementById('payTbody'), fStatus=document.getElementById('fStatus'), fSearch=document.getElementById('fSearch'), fClear=document.getElementById('fClear'), btnSeed=document.getElementById('btnSeed'), toast=document.getElementById('toast');
  const show=t=>{toast.textContent=t;toast.classList.add('show');toast.classList.remove('hidden');setTimeout(()=>{toast.classList.add('hidden');toast.classList.remove('show')},1600)};
  function log(type,meta){const a=aud();a.unshift({type,meta,user:key,ts:new Date().toISOString()});setAud(a.slice(0,500));}

  function seedIfEmpty(){
    const mine=pays().filter(p=>p.user===key); if(mine.length) return;
    const list=pays(); list.unshift(
      {id:`PAY-${Date.now().toString().slice(-6)}`, refId:'CTE-2025-0001', refType:'CTE', amount:5000, status:'Pending', user:key, createdAt:new Date().toISOString()}
    ); setPays(list);
  }
  function badge(s){const map={Pending:'#2a6fa6',Paid:'#2f7e1d',Failed:'#d64545'};return `<span style="display:inline-block;padding:2px 8px;border:1px solid #e6edf3;background:#f7fbff;border-radius:999px;color:${map[s]||'#1f5680'};font-weight:700">${s}</span>`;}
  function fmtAmt(n){return `₹ ${(+n||0).toLocaleString('en-IN')}`}

  function render(){
    let list=pays().filter(p=>p.user===key);
    const s=(fStatus.value||'all').toLowerCase(), q=(fSearch.value||'').toLowerCase();
    if(s!=='all') list=list.filter(x=>(x.status||'').toLowerCase()===s);
    if(q) list=list.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
    list=list.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    if(!list.length){tbody.innerHTML=`<tr><td colspan="5" class="cm-muted cm-small" style="text-align:center;">No payments.</td></tr>`; return;}
    tbody.innerHTML=list.map(p=>`<tr>
      <td class="cm-ellipsis">${p.id}</td>
      <td class="cm-ellipsis">${p.refType||''} — ${p.refId||''}</td>
      <td>${fmtAmt(p.amount)}</td>
      <td>${badge(p.status||'Pending')}</td>
      <td>
        ${p.status!=='Paid'?`<button class="cm-btn ghost" data-pay="${p.id}">Pay now</button>`:''}
        ${p.status==='Paid'?`<button class="cm-btn ghost" data-rec="${p.id}">Receipt</button>`:''}
        <button class="cm-btn ghost" data-view="${p.id}">View</button>
      </td>
    </tr>`).join('');
  }

  tbody.addEventListener('click',e=>{
    const t=e.target; if(!(t instanceof HTMLElement))return;
    const id=t.dataset.pay||t.dataset.rec||t.dataset.view; if(!id) return;
    const list=pays(); const p=list.find(x=>x.id===id && x.user===key); if(!p) return;

    if(t.dataset.pay){
      p.status='Paid'; p.paidAt=new Date().toISOString(); setPays(list); log('payment_completed',{id:p.id,refId:p.refId}); render(); show('Payment marked Paid (demo).');
    }
    if(t.dataset.rec){
      const w=window.open('','_blank'); w?.document.write(`<html><head><title>${p.id} Receipt</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}</style></head><body>
      <h2>Receipt — ${p.id}</h2><table><tr><th>Reference</th><td>${p.refType||''} — ${p.refId||''}</td></tr><tr><th>Amount</th><td>${fmtAmt(p.amount)}</td></tr><tr><th>Paid At</th><td>${p.paidAt||'—'}</td></tr></table>
      <script>setTimeout(()=>print(),100)</script></body></html>`); w?.document.close(); log('receipt_downloaded',{id:p.id});
    }
    if(t.dataset.view){
      alert(`${p.id}\nRef: ${p.refType||''} — ${p.refId||''}\nAmount: ${fmtAmt(p.amount)}\nStatus: ${p.status}`);
      log('payment_viewed',{id:p.id});
    }
  });

  fStatus.addEventListener('change',render); fSearch.addEventListener('input',render); fClear.addEventListener('click',()=>{fStatus.value='all'; fSearch.value=''; render();});
  btnSeed?.addEventListener('click',()=>{seedIfEmpty(); render();});
  document.getElementById('btnLogout')?.addEventListener('click',()=>{const s=sessions(); s.currentUser=null; set(K_SESS,s); location.href='reg-portal.html';});

  seedIfEmpty(); render();
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{ if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active'); });
})();