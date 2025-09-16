(()=> {
  const K_USERS='ucams_users',K_SESS='ucams_sessions',K_AUTHS='ucams_authorizations',K_PAYS='ucams_payments';
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d), set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}"), auths=()=>get(K_AUTHS,"[]"), pays=()=>get(K_PAYS,"[]");
  const sess=sessions(); if(!sess.currentUser){location.href='reg-portal.html';return;} const key=sess.currentUser, u=users()[key]; if(!u){location.href='reg-portal.html';return;}
  const tbody=document.getElementById('dlTbody');

  function collect(){
    const docs=[];
    // Authorization PDFs (from authorizations page concept)
    auths().filter(a=>a.user===key).forEach(a=>{
      docs.push({kind:'Authorization PDF', ref:`${a.type} — ${a.id}`, ts:a.issuedOn||a.validFrom||a.validTo||'', action:{type:'auth', id:a.id}});
    });
    // Payment Receipts
    pays().filter(p=>p.user===key && p.status==='Paid').forEach(p=>{
      docs.push({kind:'Receipt', ref:`${p.refType||''} — ${p.refId||''}`, ts:p.paidAt||p.createdAt||'', action:{type:'receipt', id:p.id}});
    });
    return docs.sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
  }

  function render(){
    const items=collect();
    if(!items.length){ tbody.innerHTML=`<tr><td colspan="4" class="cm-muted cm-small" style="text-align:center;">No documents yet.</td></tr>`; return; }
    tbody.innerHTML=items.map(d=>`<tr>
      <td>${d.kind}</td><td class="cm-ellipsis" title="${d.ref}">${d.ref}</td>
      <td>${d.ts?new Date(d.ts).toISOString().slice(0,10):'—'}</td>
      <td><button class="cm-btn ghost" data-dl="${d.action.type}:${d.action.id}">Download</button></td>
    </tr>`).join('');
  }

  tbody.addEventListener('click',e=>{
    const t=e.target; if(!(t instanceof HTMLElement))return;
    const dl=t.dataset.dl; if(!dl) return;
    const [type,id]=dl.split(':');
    if(type==='receipt'){
      const p=pays().find(x=>x.id===id && x.user===key); if(!p) return;
      const w=window.open('','_blank'); w?.document.write(`<html><head><title>${p.id} Receipt</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}</style></head><body>
      <h2>Receipt — ${p.id}</h2><table><tr><th>Reference</th><td>${p.refType||''} — ${p.refId||''}</td></tr><tr><th>Amount</th><td>₹ ${(p.amount||0).toLocaleString('en-IN')}</td></tr><tr><th>Paid At</th><td>${p.paidAt||'—'}</td></tr></table>
      <script>setTimeout(()=>print(),100)</script></body></html>`); w?.document.close();
    } else if(type==='auth'){
      const a=(get(K_AUTHS,"[]")).find(x=>x.id===id && x.user===key); if(!a) return;
      const w=window.open('','_blank'); w?.document.write(`<html><head><title>${a.id}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}</style></head><body>
      <h2>${a.type} <small>(${a.id})</small></h2><table><tr><th>Unit</th><td>${a.unitName||'—'}</td></tr><tr><th>Issued</th><td>${a.issuedOn||'—'}</td></tr><tr><th>Validity</th><td>${a.validFrom||'—'} → ${a.validTo||'—'}</td></tr><tr><th>Status</th><td>${a.status||'—'}</td></tr></table>
      <script>setTimeout(()=>print(),100)</script></body></html>`); w?.document.close();
    }
  });

  document.getElementById('btnLogout')?.addEventListener('click',()=>{const s=sessions(); s.currentUser=null; set(K_SESS,s); location.href='reg-portal.html';});
  document.getElementById('btnRefresh')?.addEventListener('click',render);

  render();
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{ if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active'); });
})();