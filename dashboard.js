(() => {
  // Keys
  const K_USERS='ucams_users', K_SESS='ucams_sessions';
  const K_APPS='ucams_applications', K_AUTHS='ucams_authorizations', K_ACTS='ucams_activities';
  const DEMO_KEY='ucams_demo_mode'; // 'true' | 'false'

  // Helpers
  const get=(k,d)=>JSON.parse(localStorage.getItem(k)||d);
  const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const users=()=>get(K_USERS,"{}"), sessions=()=>get(K_SESS,"{}");
  const realApps =()=>get(K_APPS,"[]"), realAuths=()=>get(K_AUTHS,"[]"), realActs=()=>get(K_ACTS,"[]");

  // Guard
  const sess=sessions(); if(!sess.currentUser){location.href='reg-portal.html';return;}
  const key=sess.currentUser; const u=users()[key]; if(!u){location.href='reg-portal.html';return;}

  // Welcome text (kept)
  const deviceLabel=(u.deviceName||u.device)||navigator.userAgent;
  document.getElementById('whoami').textContent=u.name||key;
  document.getElementById('whoRole').textContent=u.role||'—';
  document.getElementById('whoUA').textContent=deviceLabel;

  // Chart colors
  const C={blue:'#2a6fa6',blue2:'#6aa3d2',blue3:'#9bc2e6',green:'#5fa629',green2:'#8bd35f',green3:'#c7e9a8',amber:'#f0ad4e',red:'#d64545',gray:'#94a3b8'};

  // Utils
  const sum=a=>(a||[]).reduce((x,y)=>x+(+y||0),0);
  const monthKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;}
  const lastNMonths=n=>{const out=[];const now=new Date();for(let i=n-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}return out;}
  const daysLeft=d=>Math.ceil((new Date(d).getTime()-Date.now())/86400000);

  function safeChart(ctx,cfg){
    if(!window.Chart||!ctx){const el=ctx?.canvas?.parentElement; if(el) el.innerHTML=`<div class="muted small" style="padding:12px;">Charts unavailable.</div>`; return null;}
    return new Chart(ctx,cfg);
  }
  function renderOrEmpty(id,cfg,empty,msg){
    const cv=document.getElementById(id); if(!cv) return null;
    // reset container (in case a previous fallback replaced it)
    cv.parentElement.innerHTML=`<canvas id="${id}" class="${cv.className}"></canvas>`;
    const el=document.getElementById(id);
    if(empty){el.parentElement.innerHTML=`<div class="muted small" style="padding:12px;">${msg}</div>`; return null;}
    return safeChart(el.getContext('2d'),cfg);
  }

  // Demo dataset (in-memory only)
  function demoData(user){
    const now=new Date();
    return {
      apps:[
        {id:'CTE-2025-0001',type:'CTE',status:'Submitted',user,ts:new Date(now.getFullYear(),now.getMonth()-1,12).toISOString()},
        {id:'CTO-2025-0001',type:'CTO (Air)',status:'Draft',user,ts:new Date(now.getFullYear(),now.getMonth()-0, 4).toISOString()},
        {id:'REN-CTO-2024-0007',type:'Renewal CTO (Water)',status:'Approved',user,ts:new Date(now.getFullYear(),now.getMonth()-3,22).toISOString()},
        {id:'CTE-2024-0153',type:'CTE',status:'Rejected',user,ts:new Date(now.getFullYear(),now.getMonth()-7, 8).toISOString()},
      ],
      auths:[
        {id:'AUTH-CTE-001',type:'CTE',status:'Active',user,validTo:new Date(Date.now()+45*864e5).toISOString()},
        {id:'AUTH-CTO-001',type:'CTO (Air)',status:'Active',user,validTo:new Date(Date.now()+150*864e5).toISOString()},
        {id:'AUTH-HW-001', type:'Authorization (HW)',status:'Expired',user,validTo:new Date(Date.now()-10*864e5).toISOString()}
      ],
      acts:[
        {id:'ACT-PAY-001',type:'payment',title:'Pay CTE fee',status:'pending',user,dueAt:new Date(Date.now()+3*864e5).toISOString()},
        {id:'ACT-INSP-001',type:'inspection',title:'Site inspection',status:'in_progress',user,dueAt:new Date(Date.now()+10*864e5).toISOString()},
        {id:'ACT-UPL-001',type:'compliance',title:'Upload clarifications',status:'awaiting_applicant',user,dueAt:new Date(Date.now()+5*864e5).toISOString()}
      ]
    };
  }

  function readModel(useDemo){
    if(useDemo) return demoData(key);
    return { apps:realApps().filter(a=>a.user===key),
             auths:realAuths().filter(a=>a.user===key),
             acts:realActs().filter(a=>a.user===key) };
  }

  let charts=[]; const destroy=()=>{charts.forEach(c=>c&&c.destroy&&c.destroy()); charts=[];}

  function render(useDemo){
    destroy();
    const {apps,auths,acts}=readModel(useDemo);

    // Derivations
    const months=lastNMonths(12);
    const appByStatus=apps.reduce((m,a)=>{
      const s=(a.status||'').toLowerCase();
      const norm=s.includes('draft')?'Draft':s.includes('submit')?'Submitted':s.includes('scrutin')?'Under Scrutiny':s.includes('approve')?'Approved':s.includes('reject')?'Rejected':'Other';
      m[norm]=(m[norm]||0)+1; return m;
    },{Draft:0,Submitted:0,'Under Scrutiny':0,Approved:0,Rejected:0,Other:0});
    const appByMonth=months.map(mk=>apps.filter(a=>monthKey(a.ts||a.createdAt||Date.now())===mk).length);

    const expBuckets={'Expired':0,'≤30d':0,'31–60d':0,'61–90d':0,'>90d':0};
    auths.forEach(a=>{const rem=daysLeft(a.validTo); if(isNaN(rem))return;
      if(rem<0)expBuckets['Expired']++; else if(rem<=30)expBuckets['≤30d']++; else if(rem<=60)expBuckets['31–60d']++; else if(rem<=90)expBuckets['61–90d']++; else expBuckets['>90d']++;});

    const actByStatus=acts.reduce((m,a)=>{const s=(a.status||'pending').toLowerCase(); const norm=s==='in progress'?'in_progress':s; m[norm]=(m[norm]||0)+1; return m;},{pending:0,in_progress:0,awaiting_applicant:0,completed:0,overdue:0,rejected:0});

    // KPIs
    document.getElementById('kpiApps').textContent=apps.length;
    document.getElementById('kpiActs').textContent=acts.filter(a=>a.status!=='completed').length;
    document.getElementById('kpiAuths').textContent=auths.filter(a=>(a.status||'').toLowerCase()==='active').length;
    document.getElementById('kpiExp').textContent=expBuckets['≤30d']+expBuckets['31–60d'];
    document.getElementById('kpiAppsSub').textContent=`${appByStatus.Submitted||0} submitted · ${appByStatus.Draft||0} draft`;
    document.getElementById('kpiActsSub').textContent=`${actByStatus.pending||0} pending · ${actByStatus.overdue||0} overdue`;
    document.getElementById('kpiAuthsSub').textContent=`${auths.length} total`;
    document.getElementById('kpiExpSub').textContent=`${expBuckets['≤30d']} in ≤30d · ${expBuckets['31–60d']} in ≤60d`;

    // Charts
    const common={options:{responsive:true,animation:{duration:700,easing:'easeOutQuart'},plugins:{legend:{position:'bottom',labels:{boxWidth:14,usePointStyle:true}}},scales:{x:{grid:{color:'#eef2f7'}},y:{grid:{color:'#eef2f7'},ticks:{precision:0}}}}};

    const appStatusVals=Object.values(appByStatus);
    charts.push(renderOrEmpty('chartAppStatus',{
      type:'doughnut',
      data:{labels:Object.keys(appByStatus),datasets:[{data:appStatusVals,backgroundColor:[C.blue,C.green,C.blue2,C.green2,C.red,C.gray],hoverOffset:6}]},
      options:{...common.options,cutout:'60%'}
    }, sum(appStatusVals)===0, 'No application data yet.'));

    charts.push(renderOrEmpty('chartAppTrend',{
      type:'line',
      data:{labels:months,datasets:[{label:'Applications',data:appByMonth,tension:.35,fill:true,backgroundColor:'rgba(42,111,166,.12)',borderColor:C.blue,pointRadius:3,pointHoverRadius:5}]},
      options:common.options
    }, sum(appByMonth)===0, 'No submissions in the last 12 months.'));

    const expVals=Object.values(expBuckets);
    charts.push(renderOrEmpty('chartAuthExpiry',{
      type:'bar',
      data:{labels:Object.keys(expBuckets),datasets:[{label:'Count',data:expVals,backgroundColor:[C.red,C.amber,C.amber,C.blue2,C.green]}]},
      options:common.options
    }, sum(expVals)===0, 'No authorizations to show.'));

    const actVals=[actByStatus.pending||0,actByStatus.in_progress||0,actByStatus.awaiting_applicant||0,actByStatus.completed||0,actByStatus.overdue||0,actByStatus.rejected||0];
    charts.push(renderOrEmpty('chartActStatus',{
      type:'bar',
      data:{labels:['Pending','In Progress','Awaiting Applicant','Completed','Overdue','Rejected'],datasets:[{label:'Activities',data:actVals,backgroundColor:[C.blue,C.blue2,C.amber,C.green,C.red,C.gray]}]},
      options:{...common.options,indexAxis:'y'}
    }, sum(actVals)===0, 'No activities yet.'));
  }

  // Toggle
  const demoToggle=document.getElementById('demoToggle');
  const initialDemo=(localStorage.getItem(DEMO_KEY)||'false')==='true';
  if(demoToggle) demoToggle.checked=initialDemo;
  render(initialDemo);

  demoToggle?.addEventListener('change',e=>{
    const useDemo=!!e.target.checked;
    localStorage.setItem(DEMO_KEY,String(useDemo));
    render(useDemo);
  });

  // Logout & nav highlight
  document.getElementById('btnLogout')?.addEventListener('click',()=>{
    const s=sessions(); s.currentUser=null; set(K_SESS,s);
    setTimeout(()=>location.href='reg-portal.html',300);
  });
  document.querySelectorAll('.cm-nav-list a').forEach(a=>{
    if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active');
  });
})();