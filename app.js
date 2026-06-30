(function(){
  const VERSION = 'v2026.06.25-patch31-scroll-top';
  const TXN_COLUMNS = ['TxnID','SourceYear','SourceRow','TxnDate','Season','GameID','Game','AssetType','Category','TransactionType','Description','AllocationType','TotalAmount','Dennis','Joel','Kyle','Seth','Dennis_x2','DennisSeat1','JoelSeat','KyleSeat','SethSeat','DennisSeat2','NeedsReview','ReviewReason','Notes'];

  const DATA = {
    metrics:{currentAccountBalance:0,sales2026:0,lifetimeSales:6531.60,lifetimeParking:2403.00,ticketActivity:4128.60},
    activeFunds:[
      {name:'Dennis',balance:0,rollForward:700,cashPaid:1124},
      {name:'Joel',balance:0,rollForward:700,cashPaid:1124},
      {name:'Kyle',balance:0,rollForward:310,cashPaid:1514},
      {name:'Dennis x 2',balance:0,rollForward:0,cashPaid:1824}
    ],
    seatAccounts:[
      {seat:'Dennis Seat 1',owner:'Dennis',activeFrom:'2021',activeTo:'Current',balance:0},
      {seat:'Joel Seat',owner:'Joel',activeFrom:'2021',activeTo:'Current',balance:0},
      {seat:'Kyle Seat',owner:'Kyle',activeFrom:'2021',activeTo:'Current',balance:0},
      {seat:'Seth Seat',owner:'Seth',activeFrom:'2021',activeTo:'2025',balance:0},
      {seat:'Dennis Seat 2',owner:'Dennis',activeFrom:'2026',activeTo:'Current',balance:0}
    ],
    parking:[{year:'2024',amount:1903.50},{year:'2025',amount:499.50},{year:'2026',amount:0}],
    history:[
      {season:'2021',record:'2-10',games:12,note:''},{season:'2022',record:'4-8',games:12,note:''},{season:'2023',record:'3-9',games:12,note:''},
      {season:'2024',record:'11-2',games:13,note:'CFP first round'},{season:'2025',record:'16-0',games:16,note:'🏆 National Champions'},{season:'2026',record:'0-0',games:12,note:'Upcoming'}
    ],
    postseason2025:[
      {date:'2025-12-06',game:'Ohio State · Lucas Oil Stadium',result:'W 13-10',flag:'Big Ten Championship; Postseason'},
      {date:'2026-01-01',game:'Alabama · Rose Bowl',result:'W 38-3',flag:'Rose Bowl; CFP; Postseason'},
      {date:'2026-01-09',game:'Oregon · Mercedes-Benz Stadium',result:'W 56-22',flag:'Peach Bowl; CFP Semifinal; Postseason'},
      {date:'2026-01-19',game:'Miami (FL) · Hard Rock Stadium',result:'W 27-21',flag:'CFP National Championship; Postseason'}
    ]
  };

  const presets={
    ticketSale:{label:'Ticket sale',assetType:'Game Ticket',category:'Sale',transactionType:'Ticket Sale',allocationType:'Seat Owner Only',owner:'Dennis',sign:'positive',description:'Ticket sale',hint:'Use when a member or seat owner sells game tickets.'},
    parkingSale:{label:'Parking sale',assetType:'Parking',category:'Sale',transactionType:'Parking Sale',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'Parking sale',hint:'Use when one member sells or uses a parking pass.'},
    ticketPurchase:{label:'Game ticket purchase',assetType:'Game Ticket',category:'Ticket Purchase',transactionType:'Ticket Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Game ticket purchase',hint:'Use for a shared game-ticket cost split across active seats.'},
    parkingPurchase:{label:'Parking purchase',assetType:'Parking',category:'Parking Purchase',transactionType:'Parking Purchase',allocationType:'Member Split',owner:'All Members',sign:'negative',description:'Parking purchase',hint:'Use for parking cost split across members.'},
    seasonPayment:{label:'Season-ticket payment',assetType:'Game Ticket',category:'Future Season Ticket',transactionType:'Season Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Season-ticket payment',hint:'Use for IU season ticket payment/installment.'},
    postseasonPurchase:{label:'Postseason purchase',assetType:'Game Ticket',category:'Postseason Purchase',transactionType:'Postseason Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Postseason ticket purchase',hint:'Use for bowl/playoff/championship purchase.'},
    postseasonResale:{label:'Postseason resale',assetType:'Game Ticket',category:'Postseason Resale',transactionType:'Postseason Resale',allocationType:'Seat Split',owner:'All Active Seats',sign:'positive',description:'Postseason resale',hint:'Use for resale proceeds from postseason tickets.'},
    manualTopoff:{label:'Manual top-off / donation',assetType:'Adjustment',category:'Manual Top-off',transactionType:'Fund Donation',allocationType:'Dennis Joel Kyle Split',owner:'Dennis Joel Kyle',sign:'positive',description:'Manual top-off',hint:'Use when adding donated/top-off money to the fund.'},
    reimbursement:{label:'Reimbursement',assetType:'Adjustment',category:'Reimbursement',transactionType:'Reimbursement',allocationType:'Member Specific',owner:'Dennis',sign:'negative',description:'Reimbursement paid from fund',hint:'Use when the fund reimburses a member.'},
    adjustment:{label:'Adjustment',assetType:'Adjustment',category:'Adjustment',transactionType:'Manual Adjustment',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'Manual adjustment',hint:'Use sparingly for manual corrections.'},
    reversal:{label:'Reversal / correction',assetType:'Adjustment',category:'Reversal',transactionType:'Reversal',allocationType:'Member Specific',owner:'Dennis',sign:'opposite',description:'Reversal of prior transaction',hint:'Preferred way to undo a row while preserving audit trail.'},
    test:{label:'TEST writeback validation',assetType:'Game Ticket',category:'Test',transactionType:'Graph Writeback Test',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'TEST - Graph writeback validation',hint:'Use only for safe writeback testing, then delete the test row.'}
  };

  const allScreens=[['score','🏟️','Score'],['money','💰','Money'],['seats','🎟️','Seats'],['parking','🅿️','Parking'],['history','🏆','History'],['settle','🤝','Settle'],['manager','✍️','Manager']];
  const visibleScreens=()=>allScreens.filter(([id])=>id!=='manager'||dennisView());
  function renderNav(){const n=$('#bottomNav'); if(!n) return; n.innerHTML=visibleScreens().map(([id,icon,label])=>`<button class="navbtn" data-screen="${id}"><span>${icon}</span>${label}</button>`).join('');}
  let current='score';
  let connection={connected:false,isManager:false,profile:null};
  let liveLedger={loaded:false,loading:false,error:null,lastLoaded:null,transactions:[],lastWrite:null};
  let publicSnapshot={loaded:false,error:null,meta:null};
  let selectedSeason='active';

  const $=s=>document.querySelector(s);
  const money=n=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const money0=n=>'$'+Math.round(Number(n||0)).toLocaleString('en-US');
  const round2=v=>Math.round(Number(v||0)*100)/100;
  const SETTLED_TOLERANCE = 1.00;
  const closeToZero = v => Math.abs(Number(v||0)) <= SETTLED_TOLERANCE;
  const settledAmount = v => closeToZero(v) ? 0 : round2(v);
  const escapeHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]||ch));
  function isSaleLike(t){
    const words=[t&&t.Category,t&&t.TransactionType,t&&t.Description,t&&t.AssetType].map(x=>String(x||'').toLowerCase()).join(' ');
    const total=rowTotal(t);
    if(/sale|resale|credit|top.?off|donation|opening balance|reimbursement received/.test(words)) return true;
    if(/purchase|payment|fee|tax|travel|expense|reimbursement paid|cost/.test(words)) return false;
    return total>0;
  }
  const cfg=()=>window.HTCC_CONFIG||{};
  const graphConfigured=()=>cfg().authMode==='graph'||cfg().graphEnabled===true;
  const managerRequested=()=>new URLSearchParams(window.location.search).get('manager')==='1';
  const publicMemberView=()=>!managerRequested()&&!connection.connected;
  const dennisView=()=>managerRequested()||connection.connected;
  const ready=()=>window.HTCC_GRAPH&&window.HTCC_GRAPH.msalReady&&window.HTCC_GRAPH.msalReady();
  const userEmail=profile=>String((profile&&(profile.mail||profile.userPrincipalName))||'').toLowerCase();
  const managerEmail=()=>String(cfg().managerEmail||'').toLowerCase();

  function dataUpdatedText(){
    if(connection.connected && liveLedger.lastLoaded) return 'Live workbook refreshed '+fmtDateTime(liveLedger.lastLoaded);
    if(publicSnapshot.loaded && publicSnapshot.meta && publicSnapshot.meta.publishedAt) return 'Updated '+fmtDateTime(publicSnapshot.meta.publishedAt);
    if(!managerRequested()) return 'Snapshot pending';
    return '';
  }
  function setFooter(){
    const el=$('#footerUpdated');
    if(el) el.textContent=dataUpdatedText();
  }

  function setMode(){
    let text='Read-only member view';
    const btn=$('#connectBtn');
    const status=$('.status');
    const publicView=!managerRequested()&&!connection.connected;
    if(status) status.style.display=publicView?'none':'block';
    const showManagerConnect=managerRequested() || connection.connected;
    if(btn){
      btn.style.display=showManagerConnect?'inline-flex':'none';
      btn.textContent=connection.connected?'Refresh Workbook':'Connect OneDrive';
      btn.title=showManagerConnect?'Dennis manager/live workbook mode':'Hidden in public member view';
    }
    if(graphConfigured() && managerRequested()) text=ready()?(connection.connected?'OneDrive connected':'Manager mode available'):'Manager mode unavailable - MSAL blocked';
    if(publicSnapshot.loaded && !connection.connected) text='Read-only snapshot';
    if(!publicSnapshot.loaded && !connection.connected && !managerRequested()) text='Read-only snapshot';
    if(connection.connected && liveLedger.loaded) text='OneDrive connected · workbook loaded';
    if(liveLedger.error) text='OneDrive connected · workbook read issue';
    $('#dataMode').textContent=text;
    $('#version').textContent=VERSION;
    setFooter();
  }
  function card(title,val,sub,cls=''){return `<article class="card"><h3>${title}</h3><div class="value ${cls}">${val}</div><div class="sub">${sub||''}</div></article>`;}
  function notice(html,cls=''){return `<div class="notice ${cls}">${html}</div>`;}
  function table(headers,rows){return `<div class="table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i>0?'num':''}">${c==null?'':c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  function layout(eyebrow,title,lede,body){const privacy=dennisView()?notice('<b>Privacy flag:</b> this app displays real financial data. Public member snapshot data is viewable by anyone with the GitHub Pages link.'):''; $('#app').innerHTML=`${privacy}<section><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="lede">${lede}</p>${body}</section>`;}
  function viewModeLabel(){
    if(connection.connected && connection.isManager) return {title:'Manager live workbook', body:'You are signed in as Dennis. Live OneDrive data and manager writeback are enabled.'};
    if(connection.connected) return {title:'Signed-in read-only view', body:'Live workbook data is loaded, but this account cannot write manager transactions.'};
    if(publicSnapshot.loaded) return {title:'Read-only member view', body:'This dashboard is using the published member snapshot. No OneDrive account is required, and writeback is disabled.'};
    return {title:'Read-only fallback view', body:'This dashboard is using bundled sample/snapshot data until OneDrive or the public snapshot loads.'};
  }
  function memberModeNotice(){if(publicMemberView()) return ''; const m=viewModeLabel(); return notice(`<b>${m.title}:</b> ${m.body}`);}
  function fmtDateTime(iso){
    if(!iso) return 'not published yet';
    const d=new Date(iso);
    if(Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function snapshotMetaBlock(){
    const m=publicSnapshot.meta||{};
    if(publicSnapshot.loaded && !connection.connected){
      return `<p class="sub" style="margin:8px 0 0">Updated ${fmtDateTime(m.publishedAt)} · Read-only member dashboard</p>`;
    }
    if(connection.connected && liveLedger.loaded){
      return notice(`<b>Live data status:</b> workbook loaded from OneDrive · ${liveLedger.transactions.length||0} transactions. Member snapshot must be republished from Manager for Joel/Kyle to see the latest changes.`);
    }
    return publicMemberView()?'<p class="sub">Waiting for the latest member update.</p>':notice('<b>Data status:</b> waiting for OneDrive connection or public member snapshot.');
  }

  function workbookStatus(){
    const parts=[];
    if(connection.connected && liveLedger.loaded){
      const stats=liveStats();
      parts.push('<b>Workbook:</b> loaded from OneDrive · '+stats.count+' transactions · latest '+(stats.lastTxn||'—')+' '+(stats.lastDate?('('+stats.lastDate+')'):'')+'.');
      parts.push('<button id="refreshWorkbookBtn" class="miniBtn">Refresh workbook</button>');
      if(liveLedger.lastLoaded) parts.push('<span class="sub">Last refresh: '+fmtDateTime(liveLedger.lastLoaded.toISOString())+'</span>');
    } else if(connection.connected && liveLedger.error){
      parts.push('<b>Workbook:</b> connected, but read failed: '+(liveLedger.error.message||String(liveLedger.error)));
      parts.push('<button id="refreshWorkbookBtn" class="miniBtn">Retry workbook refresh</button>');
    } else if(connection.connected){
      parts.push('<b>Workbook:</b> OneDrive connected. Workbook has not loaded yet.');
      parts.push('<button id="refreshWorkbookBtn" class="miniBtn">Load workbook</button>');
    } else if(publicSnapshot.loaded){
      const m=publicSnapshot.meta||{};
      parts.push('<b>Public snapshot:</b> read-only member data · '+(m.rowCount||liveLedger.transactions.length||0)+' transactions · published '+fmtDateTime(m.publishedAt)+'.');
    } else if(graphConfigured()){
      parts.push('<b>Manager mode:</b> use ?manager=1 to connect OneDrive and publish snapshots.');
    } else {
      parts.push('<b>Data:</b> bundled fallback data.');
    }
    return '<div class="notice">'+parts.join(' ')+'</div>';
  }

  function buildMemberSummary(){
    const scope='2026';
    const rows=scopeRows(scope);
    const sales=rows.filter(t=>isSaleLike(t) && String(t.AssetType||'')!=='Parking').reduce((a,t)=>a+Math.max(0,rowTotal(t)),0);
    const parkingSales=rows.filter(t=>isSaleLike(t) && String(t.AssetType||'')==='Parking').reduce((a,t)=>a+Math.max(0,rowTotal(t)),0);
    return {season:2026,fundBalance:0,memberStatus:'Everyone paid up',ticketSales:sales,parkingSales:parkingSales,nextActivity:'First Sale',lastFundActivity:lastFundActivityDisplay(),publishedAt:new Date().toISOString()};
  }

  function rowToTxn(row){
    const vals=(row&&row.values&&row.values[0])||[];
    const obj={}; TXN_COLUMNS.forEach((c,i)=>obj[c]=vals[i]); return obj;
  }
  function txDateValue(t){return t.TxnDate || '';}
  function txSortValue(t){return String(txDateValue(t)||'0000-00-00') + String(t.TxnID||'');}
  function recentTxns(limit=10){return [...liveLedger.transactions].sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))).slice(0,limit);}
  function liveStats(){
    const tx=liveLedger.transactions;
    const last=recentTxns(1)[0];
    const addedFromApp=tx.filter(t=>String(t.Notes||'').includes('Hoosier Ticket Command Center')).length;
    return {count:tx.length, lastTxn:last?last.TxnID:'—', lastDate:last?last.TxnDate:'—', addedFromApp, last};
  }
  function lastFundActivityDisplay(){
    const tx = recentTxns(1)[0];
    if(!tx){
      return publicSnapshot.loaded ? {value:'Public snapshot loaded', sub:'member read-only data'} : {value:'Connect OneDrive', sub:'or publish a member snapshot'};
    }
    const category = tx.Category || tx.TransactionType || tx.AssetType || 'Fund activity';
    const amount = money(rowTotal(tx));
    const detail = tx.Game || tx.Description || tx.TransactionType || '';
    const date = tx.TxnDate || '';
    return { value:`${category} · ${amount}`, sub:[detail,date].filter(Boolean).join(' · ') };
  }
  async function refreshLedger(){
    if(!connection.connected || !window.HTCC_GRAPH || !window.HTCC_GRAPH.getTransactions) return;
    liveLedger.loading=true; liveLedger.error=null; setMode();
    try{
      const rows=await window.HTCC_GRAPH.getTransactions();
      liveLedger.transactions=(rows.value||[]).map(rowToTxn);
      liveLedger.loaded=true; liveLedger.lastLoaded=new Date();
    }catch(e){
      liveLedger.error=e; console.error('Workbook refresh failed',e);
    }finally{
      liveLedger.loading=false; setMode();
    }
  }
  function refreshBlock(){
    if(!connection.connected){
      if(managerRequested()) return notice('<b>Workbook:</b> not connected yet. Click Connect OneDrive to load live transactions.');
      return `<div class="card"><h3>Member data not published yet</h3><div class="sub">Dennis needs to publish the latest member snapshot before this page has current data.</div></div>`;
    }
    if(liveLedger.error) return notice('<b>Workbook read issue:</b> '+(liveLedger.error.message||String(liveLedger.error)),'danger');
    if(liveLedger.loaded){const s=liveStats(); return dennisView()?notice(`<b>Workbook loaded:</b> ${s.count} transactions · latest ${s.lastTxn} (${s.lastDate}) · ${s.addedFromApp} added from the app. <button class="btn small" id="refreshBtn">Refresh workbook</button>`):'';}
    return notice('<b>Workbook connected:</b> live transaction rows have not been loaded yet. <button class="btn small" id="refreshBtn">Load workbook</button>');
  }
  function bindRefresh(){const b=$('#refreshBtn'); if(b)b.onclick=async()=>{await refreshLedger(); show(current);};}
  function recentTransactionsBlock(limit=10){
    if(!liveLedger.loaded) return refreshBlock();
    const rows=recentTxns(limit).map(t=>[t.TxnID,t.TxnDate,t.Game||t.Description,t.AssetType,t.Category,money(t.TotalAmount),t.AllocationType]);
    return `${dennisView()?'<p class="eyebrow" style="margin-top:26px">Recent Ledger Activity</p>'+refreshBlock():'<p class="eyebrow" style="margin-top:26px">Recent Money Moves</p>'}${dennisView()?table(['TxnID','Date','Game/Event','Asset','Category','Total','Allocation'],rows):memberActivityTable(recentTxns(limit),limit)}`;
  }
  function uniqueTxValues(field){return [...new Set(liveLedger.transactions.map(t=>t[field]).filter(v=>v!==undefined&&v!==null&&String(v).trim()!==''))].sort((a,b)=>String(a).localeCompare(String(b)));}
  function txMemberHit(t,member){return Number(t[member]||0)!==0 || Number(t[member+'Seat']||0)!==0;}
  function filteredTxns(){
    if(!liveLedger.loaded) return [];
    const season=$('#filterSeason')?$('#filterSeason').value:'All';
    const asset=$('#filterAsset')?$('#filterAsset').value:'All';
    const member=$('#filterMember')?$('#filterMember').value:'All';
    const search=String($('#filterSearch')?$('#filterSearch').value:'').toLowerCase();
    return recentTxns(500).filter(t=>{
      if(season!=='All' && String(t.Season)!==season) return false;
      if(asset!=='All' && String(t.AssetType)!==asset) return false;
      if(member!=='All' && !txMemberHit(t,member)) return false;
      if(search){ const hay=TXN_COLUMNS.map(c=>String(t[c]||'')).join(' ').toLowerCase(); if(!hay.includes(search)) return false; }
      return true;
    });
  }
  function transactionFiltersBlock(limit=25){
    if(!liveLedger.loaded) return refreshBlock();
    const seasons=uniqueTxValues('Season'); const assets=uniqueTxValues('AssetType');
    const rows=filteredTxns().slice(0,limit).map(t=>[t.TxnID,t.TxnDate,t.Season,t.Game||t.Description,t.AssetType,t.Category,money(t.TotalAmount),t.AllocationType]);
    return `<p class="eyebrow" style="margin-top:26px">Transaction filters</p><div class="card"><div class="form compact"><label>Season<select id="filterSeason"><option>All</option>${seasons.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Asset<select id="filterAsset"><option>All</option>${assets.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Member<select id="filterMember"><option>All</option><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Seth</option></select></label><label class="wide">Search<input id="filterSearch" placeholder="game, category, TXN ID"></label></div><p><button class="btn small" id="applyFiltersBtn">Apply filters</button></p></div>${table(['TxnID','Date','Season','Game/Event','Asset','Category','Total','Allocation'],rows)}`;
  }
  function bindFilters(){['filterSeason','filterAsset','filterMember','filterSearch'].forEach(id=>{const el=$('#'+id); if(el){el.onchange=()=>show(current); if(id==='filterSearch')el.onkeyup=e=>{if(e.key==='Enter')show(current);};}}); const b=$('#applyFiltersBtn'); if(b)b.onclick=()=>show(current);}
  function allocationPreviewTable(p){const a=p.allocation; return table(['Bucket','Amount'],[['Total',money(p.totalAmount)],['Dennis',money(a.Dennis)],['Joel',money(a.Joel)],['Kyle',money(a.Kyle)],['Seth',money(a.Seth)],['Dennis x 2',money(a.Dennis_x2)],['Dennis Seat 1',money(a.DennisSeat1)],['Joel Seat',money(a.JoelSeat)],['Kyle Seat',money(a.KyleSeat)],['Seth Seat',money(a.SethSeat)],['Dennis Seat 2',money(a.DennisSeat2)]]);}
  function reversalOptions(){return recentTxns(20).map(t=>`<option value="${t.TxnID}">${t.TxnID} · ${t.TxnDate} · ${t.Description||t.Game||''} · ${money(t.TotalAmount)}</option>`).join('');}
  function txnById(id){return liveLedger.transactions.find(t=>String(t.TxnID)===String(id));}


  function ledgerAvailable(){return liveLedger.loaded && liveLedger.transactions.length>0;}
  const memberNames=['Dennis','Joel','Kyle','Seth'];
  const seatNames=['DennisSeat1','JoelSeat','KyleSeat','SethSeat','DennisSeat2'];
  const memberLabels={Dennis:'Dennis',Joel:'Joel',Kyle:'Kyle',Seth:'Seth'};
  const seatLabels={DennisSeat1:'Dennis Seat 1',JoelSeat:'Joel Seat',KyleSeat:'Kyle Seat',SethSeat:'Seth Seat',DennisSeat2:'Dennis Seat 2'};
  const seatOwner={DennisSeat1:'Dennis',JoelSeat:'Joel',KyleSeat:'Kyle',SethSeat:'Seth',DennisSeat2:'Dennis x 2'};
  function sumField(rows,field){return round2(rows.reduce((a,t)=>a+Number(t[field]||0),0));}
  function txRows(){return ledgerAvailable()?liveLedger.transactions:[];}
  function activeSeason(){
    const seasons=txRows().map(t=>Number(t.Season||t.SourceYear||0)).filter(n=>Number.isFinite(n)&&n>2000);
    return seasons.length?Math.max(...seasons):2026;
  }
  function seasonRows(season=activeSeason()){
    return txRows().filter(t=>Number(t.Season||t.SourceYear||0)===Number(season));
  }
  function availableSeasons(){
    const years=txRows().map(t=>Number(t.Season||t.SourceYear||0)).filter(n=>Number.isFinite(n)&&n>2000);
    const fallback=DATA.history.map(h=>Number(h.season)).filter(Boolean);
    return [...new Set((years.length?years:fallback).sort((a,b)=>a-b))];
  }
  function selectedSeasonValue(){
    if(selectedSeason==='all') return 'all';
    if(selectedSeason==='active') return activeSeason();
    return Number(selectedSeason)||activeSeason();
  }
  function selectedSeasonLabel(){
    const v=selectedSeasonValue();
    return v==='all'?'All seasons':String(v);
  }
  function scopeRows(){
    if(!ledgerAvailable()) return [];
    const v=selectedSeasonValue();
    return v==='all'?txRows():seasonRows(v);
  }
  function seasonSelectorBlock(){
    if(!ledgerAvailable()) return '';
    const years=availableSeasons();
    const opts=[['active','Active season ('+activeSeason()+')'],...years.map(y=>[String(y),String(y)]),['all','All seasons']];
    const help=dennisView()?`<div class="notice"><b>Current view:</b> ${selectedSeasonLabel()}. Dennis audit sections show which rows feed these numbers.</div>`:`<div class="sub">Showing ${selectedSeasonLabel()}.</div>`; return `<div class="card season-card"><div class="form"><label>Dashboard season<select id="seasonSelect">${opts.map(([v,l])=>`<option value="${v}" ${String(selectedSeason)===String(v)?'selected':''}>${l}</option>`).join('')}</select></label>${help}</div></div>`;
  }
  function bindSeasonSelector(){const el=$('#seasonSelect'); if(el)el.onchange=()=>{selectedSeason=el.value; show(current);};}
  function scopeNote(label){
    return `<b>${label}:</b> live totals are scoped to ${selectedSeasonLabel()}. Use the season selector to compare 2024, 2025, 2026, or all seasons. The 2026 baseline assumes all members are fully paid and the fund is depleted until the first sale.`;
  }
  function rowTotal(t){return Number(t.TotalAmount||0);}
  function activeSeatKeysForSeason(season=activeSeason()){
    // Seth's seat is historical; Dennis Seat 2 is active for 2026.
    return Number(season)>=2026?['DennisSeat1','JoelSeat','KyleSeat','DennisSeat2']:['DennisSeat1','JoelSeat','KyleSeat','SethSeat'];
  }
  function activeMemberKeysForSeason(season=activeSeason()){
    // Public/member-facing people. Seth participated historically but is not part of the 2026 fund.
    return Number(season)>=2026?['Dennis','Joel','Kyle']:['Dennis','Joel','Kyle','Seth'];
  }
  function activeFundKeysForSeason(season=activeSeason()){
    // Accounting/fund shares. For 2026 there are four active fund shares: Dennis, Joel, Kyle, and Dennis's second seat/fund.
    // Dennis_x2 is rolled into Dennis on member-facing settlement, but it must still receive its own cost share.
    return Number(season)>=2026?['Dennis','Joel','Kyle','Dennis_x2']:['Dennis','Joel','Kyle','Seth'];
  }
  function fundKeyToMember(key){
    return key==='Dennis_x2'?'Dennis':key;
  }
  function memberKeysForCurrentScope(){
    const v=selectedSeasonValue();
    return v==='all'?memberNames:activeMemberKeysForSeason(v);
  }
  function seatKeysForCurrentScope(){
    const v=selectedSeasonValue();
    return v==='all'?seatNames:activeSeatKeysForSeason(v);
  }
  function activeMemberNamesLabel(){
    return memberKeysForCurrentScope().map(k=>memberLabels[k]||k).join(', ');
  }
  function seatToPerson(seat){
    return seat==='DennisSeat1'||seat==='DennisSeat2'?'Dennis':seat==='JoelSeat'?'Joel':seat==='KyleSeat'?'Kyle':seat==='SethSeat'?'Seth':'Dennis';
  }
  function rawPersonCredits(t,name){
    // Member columns represent cash/credit/proceeds attributed to that member.
    // Dennis_x2 is Dennis's second-seat money, not a fifth person.
    // Seth's 2024/2025 sale proceeds were paid directly to Seth, not deposited to the fund.
    if(name==='Seth' && sethDirectPayoutAmount(t)>0) return 0;
    return round2(Number(t[name]||0) + (name==='Dennis'?Number(t.Dennis_x2||0):0));
  }
  function rowCostImpact(t){
    if(isTicketCostRow(t) || isParkingCostRow(t) || isOtherCostRow(t)) return round2(-Math.abs(rowTotal(t)));
    return 0;
  }
  function expenseShareByPerson(t,name){
    const total=rowCostImpact(t);
    if(total>=0) return 0;
    const alloc=String(t.AllocationType||'').toLowerCase();
    const season=Number(t.Season||t.SourceYear||activeSeason());
    if(alloc.includes('seat')){
      const seats=activeSeatKeysForSeason(season);
      const per=round2(total/seats.length);
      return round2(seats.filter(seat=>seatToPerson(seat)===name).reduce((a)=>a+per,0));
    }
    if(alloc.includes('dennis joel kyle')){
      return ['Dennis','Joel','Kyle'].includes(name)?round2(total/3):0;
    }
    if(alloc.includes('member split')){
      const funds=activeFundKeysForSeason(season);
      const per=round2(total/funds.length);
      return round2(funds.filter(fundKey=>fundKeyToMember(fundKey)===name).reduce(a=>a+per,0));
    }
    if(alloc.includes('member specific') || alloc.includes('owner')){
      const ranked=activeMemberKeysForSeason(season).map(m=>[m,Math.abs(rawPersonCredits(t,m))]).sort((a,b)=>b[1]-a[1]);
      const owner=ranked[0]&&ranked[0][1]>0?ranked[0][0]:'Dennis';
      return name===owner?total:0;
    }
    return 0;
  }
  function personAmount(rows,name){
    // Settlement rule: positive means the member is owed money back from the fund;
    // negative means the member owes money into the fund.
    // For cost rows, member columns are treated as payments/credits and the cost is allocated separately.
    return round2(rows.reduce((bal,t)=>{
      const credits=rawPersonCredits(t,name);
      const cost=expenseShareByPerson(t,name);
      return bal + credits + cost;
    },0));
  }
  function personHitCount(rows,name){
    return rows.filter(t=>Math.abs(rawPersonCredits(t,name))+Math.abs(expenseShareByPerson(t,name))>0.005).length;
  }
  function memberBalances(){
    const rows=scopeRows();
    return memberKeysForCurrentScope().map(name=>({key:name,name:memberLabels[name],amount:settledAmount(personAmount(rows,name)),recent:personHitCount(rows,name)}));
  }
  function seatExpenseShare(t,seat){
    const total=rowCostImpact(t);
    if(total>=0) return 0;
    const alloc=String(t.AllocationType||'').toLowerCase();
    const season=Number(t.Season||t.SourceYear||activeSeason());
    const seats=activeSeatKeysForSeason(season);
    if(alloc.includes('seat') && seats.includes(seat)) return round2(total/seats.length);
    return 0;
  }
  function seatNet(rows,seat){
    return round2(rows.reduce((bal,t)=>bal + Number(t[seat]||0) + seatExpenseShare(t,seat),0));
  }
  function seatBalances(){
    const rows=scopeRows();
    return seatKeysForCurrentScope().map(name=>({key:name,name:seatLabels[name],owner:seatOwner[name],amount:settledAmount(seatNet(rows,name)),recent:rows.filter(t=>Math.abs(Number(t[name]||0))+Math.abs(seatExpenseShare(t,name))>0.005).length}));
  }
  function parkingNetForMember(rows,name){
    return round2(rows.reduce((bal,t)=>bal + rawPersonCredits(t,name) + expenseShareByPerson(t,name),0));
  }
  function parkingTotals(){
    const rows=scopeRows().filter(t=>String(t.AssetType||'').toLowerCase().includes('parking'));
    return memberKeysForCurrentScope().map(name=>({name,amount:settledAmount(parkingNetForMember(rows,name)),count:rows.filter(t=>Math.abs(rawPersonCredits(t,name))+Math.abs(expenseShareByPerson(t,name))>0.005).length}));
  }
  function memberRecentRows(member,limit=6){
    return recentTxns(100).filter(t=>Number(t[member]||0)!==0 || (member==='Dennis'&&Number(t.DennisSeat1||0)!==0) || (member==='Joel'&&Number(t.JoelSeat||0)!==0) || (member==='Kyle'&&Number(t.KyleSeat||0)!==0) || (member==='Seth'&&Number(t.SethSeat||0)!==0)).slice(0,limit);
  }
  function fundPositionFromBalances(balances=memberBalances()){
    // Positive fund position means cash/proceeds exist to distribute or carry forward.
    // Negative means the selected scope is underfunded and members owe money in.
    // For 2026, Dennis confirmed the baseline: all members are fully paid and the fund is depleted until the first sale.
    return round2(balances.reduce((a,b)=>a+b.amount,0));
  }
  function settlementRows(){
    const balances=memberBalances();
    const rows=[];
    balances.forEach(b=>{
      if(b.amount>0.005) rows.push(['Ticket Fund',b.name,money(b.amount),'Fund owes this member if the season/scope closed today']);
      if(b.amount<-0.005) rows.push([b.name,'Ticket Fund',money(-b.amount),'Member owes the shared fund if the season/scope closed today']);
    });
    return rows;
  }


  function activityKind(t){
    const bucket = moneyBucket(t);
    if(bucket==='Ticket Sales / Resales' || bucket==='Parking Sales / Resales') return 'Sale / Resale';
    if(bucket==='Ticket Costs' || bucket==='Parking Costs' || bucket==='Other Costs') return 'Cost / Purchase';
    if(bucket==='Member / Fund Money' || bucket==='Other Money In') return 'Adjustment';
    const text = [t.AssetType,t.Category,t.TransactionType,t.Description,t.Game].join(' ').toLowerCase();
    if(text.includes('parking')) return 'Parking';
    return 'Fund Activity';
  }
  function activityDisplayAmount(t){
    const bucket=moneyBucket(t);
    return signedMoneyAmount(t,bucket);
  }
  function activityRows(kind='All',limit=25){
    let rows = scopeRows();
    if(kind && kind !== 'All') rows = rows.filter(t=>activityKind(t)===kind);
    return [...rows].sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))).slice(0,limit);
  }
  function activitySummary(rows=scopeRows()){
    const out={sales:0,parking:0,costs:0,adjustments:0,count:rows.length};
    rows.forEach(t=>{
      const amt=activityDisplayAmount(t);
      const bucket=moneyBucket(t);
      if(bucket==='Ticket Sales / Resales' || bucket==='Parking Sales / Resales') out.sales=round2(out.sales+amt);
      else if(bucket==='Parking Costs') out.parking=round2(out.parking+amt);
      else if(bucket==='Ticket Costs' || bucket==='Other Costs') out.costs=round2(out.costs+amt);
      else if(bucket==='Member / Fund Money' || bucket==='Other Money In') out.adjustments=round2(out.adjustments+amt);
    });
    return out;
  }
  function memberActivityTable(rows,limit=15){
    const picked=[...(rows||[])].slice(0,limit);
    if(!picked.length) return notice('<b>No activity rows:</b> nothing in this scope yet.');
    return table(['Date','Activity','Game/Event','Category','Amount'],picked.map(t=>{
      const activity=activityKind(t);
      const event=t.Game || t.Description || t.TransactionType || '';
      return [t.TxnDate || '', activity, event, t.Category || t.TransactionType || '', money(activityDisplayAmount(t))];
    }));
  }


  function auditTxnTable(rows,limit=12){
    const picked=[...rows].sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))).slice(0,limit);
    if(!picked.length) return notice('<b>Audit:</b> no rows in this scope.');
    return table(['TxnID','Date','Season','Game/Event','Asset','Category','Total','Allocation'],picked.map(t=>[t.TxnID,t.TxnDate,t.Season,t.Game||t.Description,t.AssetType,t.Category,money(t.TotalAmount),t.AllocationType]));
  }
  function personCreditTotal(rows,name){return round2(rows.reduce((a,t)=>a+rawPersonCredits(t,name),0));}
  function personExpenseTotal(rows,name){return round2(rows.reduce((a,t)=>a+expenseShareByPerson(t,name),0));}
  function settlementAuditTable(){
    const rows=scopeRows();
    return table(['Member','Member-column credits / payments','Allocated costs','Net settlement balance','Rows hit'],memberKeysForCurrentScope().map(name=>[memberLabels[name],money(personCreditTotal(rows,name)),money(personExpenseTotal(rows,name)),money(personAmount(rows,name)),personHitCount(rows,name)]));
  }
  function seatAuditTable(){
    const rows=scopeRows();
    return table(['Seat','Seat-column credits / payments','Allocated seat costs','Net seat balance','Rows hit'],seatKeysForCurrentScope().map(seat=>{
      const credits=round2(rows.reduce((a,t)=>a+Number(t[seat]||0),0));
      const costs=round2(rows.reduce((a,t)=>a+seatExpenseShare(t,seat),0));
      const hits=rows.filter(t=>Math.abs(Number(t[seat]||0))+Math.abs(seatExpenseShare(t,seat))>0.005).length;
      return [seatLabels[seat],money(credits),money(costs),money(round2(credits+costs)),hits];
    }));
  }
  function rowText(t){
    return [t.AssetType,t.Category,t.TransactionType,t.Description,t.Game].join(' ').toLowerCase();
  }
  function isParkingRow(t){
    return String(t.AssetType||'').toLowerCase().includes('parking') || /parking/.test(rowText(t));
  }
  function isTicketRow(t){
    return String(t.AssetType||'').toLowerCase().includes('ticket') && !isParkingRow(t);
  }
  function categoryText(t){
    return String(t.Category||'').toLowerCase();
  }
  function typeText(t){
    return String(t.TransactionType||'').toLowerCase();
  }
  function isSaleOrResaleText(text){
    return /(^|\s)sale($|\s)|resale/.test(text);
  }
  function isPurchaseOrCostText(text){
    return /purchase|cost|expense|fee|tax|travel|airfare|season|upgrade/.test(text);
  }
  function isMemberFundingRow(t){
    const total=rowTotal(t);
    if(total<=0) return false;
    const text=rowText(t);
    return /opening balance|prior year transfer|top.?off|donation|credit|member payment|manual top/.test(text);
  }
  function isTrueTicketSaleRow(t){
    const cat=categoryText(t);
    const typ=typeText(t);
    const text=rowText(t);
    if(!isTicketRow(t)) return false;
    if(isMemberFundingRow(t)) return false;
    if(/parking|travel|airfare|fee|tax|opening|top.?off|donation|credit|adjust|transfer|member payment/.test(cat+' '+typ)) return false;
    if(/resale|(^|\s)sale($|\s)/.test(cat)) return true;
    if(/purchase/.test(cat) && !/resale|(^|\s)sale($|\s)/.test(cat)) return false;
    return /ticket sale|resale/.test(typ) && !/purchase/.test(cat);
  }
  function isParkingMoneyRow(t){
    if(!isParkingRow(t)) return false;
    const cat=categoryText(t);
    const typ=typeText(t);
    const text=rowText(t);
    if(isMemberFundingRow(t)) return false;
    // Category wins over generic TransactionType values like "Purchase/Resale".
    if(/resale|(^|\s)sale($|\s)/.test(cat) && /parking/.test(text)) return true;
    if(/purchase|cost|fee|tax|travel|expense|reimbursement|payment/.test(cat+' '+typ)) return false;
    return /parking/.test(text) && isSaleOrResaleText(cat+' '+typ+' '+text);
  }
  function isTicketCostRow(t){
    if(!isTicketRow(t)) return false;
    if(isMemberFundingRow(t)) return false;
    const cat=categoryText(t);
    const typ=typeText(t);
    const text=rowText(t);
    if(/parking|travel|airfare/.test(text)) return false;
    if(/resale/.test(cat) || (/(^|\s)sale($|\s)/.test(cat) && !/purchase/.test(cat))) return false;
    return /purchase|future season ticket|postseason purchase|other game purchase|season purchase|upgrade|fees?\/taxes?|fee|tax/.test(cat+' '+typ+' '+text);
  }
  function isParkingCostRow(t){
    if(!isParkingRow(t)) return false;
    if(isMemberFundingRow(t)) return false;
    const cat=categoryText(t);
    const typ=typeText(t);
    const text=rowText(t);
    if(/resale/.test(cat) || (/(^|\s)sale($|\s)/.test(cat) && !/purchase/.test(cat))) return false;
    return /future parking|postseason parking|parking purchase|season purchase|parking|pass|purchase|cost|fee/.test(cat+' '+typ+' '+text);
  }
  function isOtherCostRow(t){
    if(isTicketCostRow(t) || isParkingCostRow(t)) return false;
    const cat=categoryText(t);
    const typ=typeText(t);
    const text=rowText(t);
    if(isMemberFundingRow(t) || isTrueTicketSaleRow(t) || isParkingMoneyRow(t)) return false;
    if(rowTotal(t)<0) return true;
    return /travel|airfare|fee|tax|expense|cost|purchase/.test(cat+' '+typ+' '+text);
  }
  function signedMoneyAmount(t,bucket){
    const b=bucket || moneyBucket(t);
    if(b==='Ticket Sales / Resales' || b==='Parking Sales / Resales') return round2(Math.max(0,fundProceedsAmount(t)));
    if(b==='Ticket Costs' || b==='Parking Costs' || b==='Other Costs') return round2(-Math.abs(rowTotal(t)));
    if(b==='Member / Fund Money' || b==='Other Money In' || b==='Seth Direct Payout') return round2(Math.abs(rowTotal(t)));
    return round2(rowTotal(t));
  }
  function sethDirectPayoutAmount(t){
    const season=Number(t.Season||0);
    if(!(season===2024 || season===2025)) return 0;
    if(!(isTrueTicketSaleRow(t) || isParkingMoneyRow(t))) return 0;
    const seth=Number(t.Seth||0);
    return seth>0 ? seth : 0;
  }
  function fundProceedsAmount(t){
    const total=rowTotal(t);
    const excluded=sethDirectPayoutAmount(t);
    return round2(total-excluded);
  }
  function rollForwardToNextSeason(year){
    if(!Number.isFinite(Number(year))) return 0;
    const next=Number(year)+1;
    return round2(seasonRows(next).filter(isMemberFundingRow).reduce((a,t)=>a+rowTotal(t),0));
  }
  function scopedMoneySummary(){
    const rows=scopeRows();
    const ticketSales=rows.filter(isTrueTicketSaleRow).reduce((a,t)=>a+signedMoneyAmount(t,'Ticket Sales / Resales'),0);
    const parkingSales=rows.filter(isParkingMoneyRow).reduce((a,t)=>a+signedMoneyAmount(t,'Parking Sales / Resales'),0);
    const sethDirectPayout=rows.reduce((a,t)=>a+sethDirectPayoutAmount(t),0);
    const ticketCosts=rows.filter(isTicketCostRow).reduce((a,t)=>a+signedMoneyAmount(t,'Ticket Costs'),0);
    const parkingCosts=rows.filter(isParkingCostRow).reduce((a,t)=>a+signedMoneyAmount(t,'Parking Costs'),0);
    const otherCosts=rows.filter(isOtherCostRow).reduce((a,t)=>a+signedMoneyAmount(t,'Other Costs'),0);
    const memberFunding=rows.filter(isMemberFundingRow).reduce((a,t)=>a+signedMoneyAmount(t,'Member / Fund Money'),0);
    const otherPositive=rows.filter(t=>moneyBucket(t)==='Other Money In').reduce((a,t)=>a+signedMoneyAmount(t,'Other Money In'),0);
    const positive=ticketSales+parkingSales+memberFunding+otherPositive;
    const negative=ticketCosts+parkingCosts+otherCosts;
    const selected=selectedSeasonValue();
    const rollForwardNext=selected==='all'?0:rollForwardToNextSeason(selected);
    return {
      rows,total:round2(positive+negative),positive:round2(positive),negative:round2(negative),
      tickets:round2(ticketSales),parking:round2(parkingSales),ticketCosts:round2(ticketCosts),
      parkingCosts:round2(parkingCosts),otherCosts:round2(otherCosts),memberFunding:round2(memberFunding),
      sethDirectPayout:round2(sethDirectPayout),otherPositive:round2(otherPositive),rollForwardNext:round2(rollForwardNext)
    };
  }

  function moneyBucket(t){
    if(isMemberFundingRow(t)) return 'Member / Fund Money';
    if(isTrueTicketSaleRow(t)) return 'Ticket Sales / Resales';
    if(isParkingMoneyRow(t)) return 'Parking Sales / Resales';
    if(isTicketCostRow(t)) return 'Ticket Costs';
    if(isParkingCostRow(t)) return 'Parking Costs';
    if(isOtherCostRow(t)) return 'Other Costs';
    const total=rowTotal(t);
    if(total>0) return 'Other Money In';
    if(total<0) return 'Other Costs';
    return 'No Money Impact';
  }
  function bucketOrder(name){
    const order=['Ticket Sales / Resales','Parking Sales / Resales','Seth Direct Payout','Ticket Costs','Parking Costs','Other Costs','Member / Fund Money','Other Money In','No Money Impact'];
    const ix=order.indexOf(name);
    return ix<0?99:ix;
  }
  function moneyBreakdownRows(){
    const out=[];
    scopeRows().forEach(t=>{
      const bucket=moneyBucket(t);
      if(bucket!=='No Money Impact'){
        const amt=signedMoneyAmount(t,bucket);
        out.push({...t,_bucket:bucket,_amount:amt});
      }
      const seth=sethDirectPayoutAmount(t);
      if(seth>0){
        out.push({...t,_bucket:'Seth Direct Payout',_amount:seth,Description:(t.Description||t.Game||'')+' — paid directly to Seth, not deposited to fund'});
      }
    });
    return out.filter(t=>Math.abs(Number(t._amount||0))>0.004)
      .sort((a,b)=>{
        const d=bucketOrder(a._bucket)-bucketOrder(b._bucket);
        if(d) return d;
        return txSortValue(b).localeCompare(txSortValue(a));
      });
  }
  function moneyBreakdownTable(){
    const rows=moneyBreakdownRows();
    if(!rows.length) return notice('No money-impacting transactions found for '+selectedSeasonLabel()+'.');
    const grouped={};
    rows.forEach(t=>{(grouped[t._bucket]=grouped[t._bucket]||[]).push(t);});
    const sections=Object.keys(grouped).sort((a,b)=>bucketOrder(a)-bucketOrder(b)).map(bucket=>{
      const bucketRows=grouped[bucket];
      const subtotal=round2(bucketRows.reduce((a,t)=>a+Number(t._amount||0),0));
      const body=bucketRows.map(t=>[
        t.TxnDate||'',
        t.Game||t.Description||'',
        t.Category||'',
        t.Description||'',
        money(t._amount)
      ]);
      const title=`<div class="breakdown-head"><span>${bucket}</span><b>${money(subtotal)}</b></div>`;
      return `${title}${table(['Date','Game/Event','Category','Description','Amount'],body)}`;
    }).join('');
    return `<div class="money-breakdown">${sections}</div>`;
  }


  function renderScore(){
    const f=DATA.activeFunds.filter(x=>['Dennis','Joel','Kyle'].includes(x.name));
    const lastFundActivity=lastFundActivityDisplay();
    const memberStatus='Everyone paid up';
    const snapshotOrLive = memberModeNotice()+snapshotMetaBlock();
    const shareHelp = !dennisView() ? `<div class="card share-help"><h3>How to read this</h3><div class="help-row"><b>Fund Balance</b><span>money currently available</span></div><div class="help-row"><b>Member Status</b><span>whether anyone owes money</span></div><div class="help-row"><b>Sales</b><span>ticket or parking money added to the fund</span></div><div class="sub">Questions or something looks off? Text Dennis.</div></div>` : '';
    layout('Scoreboard','Game Day Dashboard','A member-first view of the 2026 ticket fund: fund status, member status, current sales, and recent activity.',`${snapshotOrLive}<div class="grid">${card('2026 Fund Balance',money(0),'fund is depleted until the first sale')}${card('Member Status',memberStatus,'Dennis, Joel, and Kyle are settled')}${card('Ticket Sales This Season',money(0),'no 2026 sale proceeds logged yet')}${card('Parking Sales This Season',money(0),'no 2026 parking sale proceeds logged yet')}${card('Next Expected Activity','First Sale','ticket or parking sale adds fund balance')}${card('Last Fund Activity',lastFundActivity.value,lastFundActivity.sub)}</div>${dennisView()?notice('<b>2026 baseline:</b> Dennis, Joel, and Kyle are fully paid into the 2026 season and the fund is $0.00 until the first sale. Technical workbook details live in Manager/audit areas.'):''}${shareHelp}<p class="eyebrow" style="margin-top:26px">Member Fund Status</p><div class="grid">${f.map(x=>`<article class="card"><h3>${x.name}</h3><div class="value">${money(0)}</div><div class="sub">settled for 2026</div><div class="line"><span>Roll-forward applied</span><b>${money(x.rollForward)}</b></div><div class="line"><span>2026 cash paid</span><b>${money(x.cashPaid)}</b></div></article>`).join('')}</div><p class="eyebrow" style="margin-top:26px">Recent Fund Activity</p>${recentTransactionsBlock(5)}${dennisView()?`<details class="card"><summary><b>Data status for Dennis</b></summary><p class="sub">This area is intentionally tucked away from the member headline view.</p>${workbookStatus()}${publicSnapshot.loaded?notice('<b>Snapshot:</b> published '+fmtDateTime((publicSnapshot.meta||{}).publishedAt)+' · '+((publicSnapshot.meta||{}).rowCount||liveLedger.transactions.length||0)+' rows.'):''}</details>`:''}`); bindRefresh();}

  function renderMoney(){
    const m=DATA.metrics;
    const live=ledgerAvailable();
    const sm=live?scopedMoneySummary():{total:0,positive:0,negative:0,tickets:0,parking:0};
    const scope=selectedSeasonLabel();
    const is2026=live && String(selectedSeasonValue())==='2026';
    const rollCard = (!is2026 && live && sm.rollForwardNext>0)
      ? card('Rolled Forward to '+(Number(selectedSeasonValue())+1),money(sm.rollForwardNext),'actual amount carried into next season')
      : card('Fund Result',money(sm.total),'money collected minus money spent for '+scope, sm.total<0?'neg':'');
    const memberFriendlyCards = is2026
      ? `${card('Fund Balance',money(0),'cash available right now')}${card('Member Status','Everyone paid up','no payments needed')}${card('Next Expected Activity','First Sale','ticket or parking sale adds money to the fund')}`
      : `${rollCard}${card('Total Costs',money(sm.negative),'ticket costs + parking costs + other costs', sm.negative<0?'neg':'')}${card('Member / Fund Money',money(sm.memberFunding),'roll-forward, top-offs, credits, and member funding')}`;
    const plainIntro = is2026
      ? '<b>2026 status:</b> everyone is paid up, no one owes money right now, and the fund is $0.00 until the first ticket or parking sale comes in.'
      : '<b>Simple read:</b> sales now count only real ticket/parking sale or resale proceeds. Member payments, top-offs, opening balances, and roll-forwards are shown separately so the fund result is not confused with gross ticket sales.';
    const salesCards = `${card('Ticket Sales / Resales',live?money(sm.tickets):money(m.ticketActivity),'actual ticket sale/resale proceeds deposited to the fund')}${card('Parking Sales / Resales',live?money(sm.parking):money(m.lifetimeParking),'parking sale/resale money deposited to the fund')}${card('Seth Direct Payout',live?money(sm.sethDirectPayout||0):money(0),'paid directly to Seth, not deposited to the fund')}${card('Ticket Costs',live?money(sm.ticketCosts):money(0),'season tickets, postseason tickets, upgrades, and ticket fees', (live&&sm.ticketCosts<0)?'neg':'')}${card('Parking Costs',live?money(sm.parkingCosts):money(0),'parking pass purchases and parking costs only', (live&&sm.parkingCosts<0)?'neg':'')}${card('Other Costs',live?money(sm.otherCosts):money(0),'travel, non-ticket fees, and miscellaneous expenses', (live&&sm.otherCosts<0)?'neg':'')}${card('Member / Fund Money',live?money(sm.memberFunding):money(0),'opening balance, roll-forward, credits, top-offs')}`;
    const dennisAudit = (live && dennisView()) ? `<details class="card"><summary><b>Dennis audit details</b></summary><p class="sub">Plain-English cards above use stricter classifications. This audit section keeps the raw ledger math available for Dennis.</p><div class="grid two">${card('Raw Ledger Total',money(sm.total),'all positive rows plus all negative rows for '+scope, sm.total<0?'neg':'')}${card('Raw Positive Rows',money(sm.positive),'all positive TotalAmount rows')}${card('Raw Negative Rows',money(sm.negative),'all negative TotalAmount rows', sm.negative<0?'neg':'')}${card('True Ticket Sales',money(sm.tickets),'ticket sale/resale rows only')}${card('Ticket Costs',money(sm.ticketCosts),'ticket purchase/cost rows', sm.ticketCosts<0?'neg':'')}${card('Parking Sales',money(sm.parking),'parking sale/resale money deposited to fund')}${card('Seth Direct Payout',money(sm.sethDirectPayout||0),'paid directly to Seth and excluded from fund proceeds')}${card('Parking Costs',money(sm.parkingCosts),'parking pass costs only', sm.parkingCosts<0?'neg':'')}${card('Other Costs',money(sm.otherCosts),'travel/fees/miscellaneous costs', sm.otherCosts<0?'neg':'')}${card('Other Positive Activity',money(sm.otherPositive),'positive rows not counted as sales, Seth payout, or member funding')}</div><p class="eyebrow" style="margin-top:18px">Money Audit Rows</p>${auditTxnTable(scopeRows(),12)}</details>` : '';
    layout('Money','Money','Plain-English fund status for members: what is in the fund, who is paid up, what has been sold, and what has been spent.',`${seasonSelectorBlock()}<p class="eyebrow" style="margin-top:26px">Fund Status</p><div class="grid two">${memberFriendlyCards}</div>${notice(plainIntro)}<p class="eyebrow" style="margin-top:26px">Sales and Cost Breakdown</p><div class="grid two">${salesCards}</div><p class="eyebrow" style="margin-top:26px">Money Breakdown for ${scope}</p>${moneyBreakdownTable()}${dennisAudit}`);
    bindSeasonSelector(); bindRefresh();
  }
  function renderSeats(){
    const live=ledgerAvailable();
    const seatRows=live?seatBalances():DATA.seatAccounts.map(s=>({name:s.seat,owner:s.owner,amount:s.balance,recent:0}));
    const scoped=live?scopeRows():[];
    const ticketRows=live?scoped.filter(t=>String(t.AssetType||'').toLowerCase().includes('ticket')):[];
    const ticketSales=round2(ticketRows.filter(t=>rowTotal(t)>0 && activityKind(t)==='Sale / Resale').reduce((a,t)=>a+rowTotal(t),0));
    const ticketCosts=round2(ticketRows.filter(t=>rowTotal(t)<0 || activityKind(t)==='Cost / Purchase').reduce((a,t)=>a+rowTotal(t),0));
    const openSeatBalances=seatRows.filter(s=>Math.abs(s.amount)>0.005);
    const settled = live && openSeatBalances.length===0;
    const summaryCards = settled
      ? `${card('Seat Status','Fully Paid','no open 2026 seat balance')}${card('Open Seat Balance',money(0),'nothing owed or due by seat')}${card('Ticket Sales',money(ticketSales),'sales/resales in this scope')}${card('Ticket Costs',money(ticketCosts),'purchases/costs in this scope',ticketCosts<0?'neg':'')}`
      : `${card('Open Seat Balances',String(openSeatBalances.length),'seats with non-zero net')}${card('Total Seat Net',money(round2(seatRows.reduce((a,s)=>a+s.amount,0))),'credits plus allocated costs')}${card('Ticket Sales',money(ticketSales),'sales/resales in this scope')}${card('Ticket Costs',money(ticketCosts),'purchases/costs in this scope',ticketCosts<0?'neg':'')}`;
    const seatCards=seatRows.map(s=>card(s.name,money(s.amount),s.amount===0?'settled / no open balance':`Owner: ${s.owner} · ${s.recent||0} ledger rows`,s.amount<0?'neg':'' )).join('');
    layout('Seats','Seat Cost & Credit Tracker','A member-friendly view of ticket/seat activity. Parking is intentionally excluded because parking is member-level, not seat-level.',`${seasonSelectorBlock()}<p class="eyebrow" style="margin-top:26px">Seat Summary</p><div class="grid two">${summaryCards}</div>${dennisView()?notice((live?scopeNote('Seat tracker')+' ':'')+'<b>How to read this page:</b> each seat should normally sit at $0.00 when that seat is fully paid and settled. Positive means the seat has credit/value due back. Negative means the seat has an open cost/amount due.'):''}<p class="eyebrow" style="margin-top:26px">Seat Balances</p><div class="grid">${seatCards}</div><p class="eyebrow" style="margin-top:26px">Ticket Activity Rows</p>${live?memberActivityTable(ticketRows.sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))),20):refreshBlock()}${dennisView()?`<details class="card"><summary><b>Manager audit: seat accounting details</b></summary><p class="sub">This section is for Dennis to verify workbook math.</p>${live?seatAuditTable():''}<p class="eyebrow" style="margin-top:18px">Seat Account Rules</p>${table(['Seat','Owner','Active From','Active To'],DATA.seatAccounts.map(s=>[s.seat,s.owner,s.activeFrom,s.activeTo]))}</details>`:''}`);
    bindSeasonSelector(); bindRefresh();
  }
  function renderParking(){
    const live=ledgerAvailable();
    const pRows=live?parkingTotals():DATA.parking.map(p=>({name:p.year,amount:p.amount,count:0}));
    const total=live?round2(pRows.reduce((a,p)=>a+p.amount,0)):DATA.parking.reduce((a,p)=>a+p.amount,0);
    const parkingRows=live?scopeRows().filter(t=>String(t.AssetType||'').toLowerCase().includes('parking')):[];
    const sales=round2(parkingRows.filter(isParkingMoneyRow).reduce((a,t)=>a+signedMoneyAmount(t,'Parking Sales / Resales'),0));
    const costs=round2(parkingRows.filter(isParkingCostRow).reduce((a,t)=>a+signedMoneyAmount(t,'Parking Costs'),0));
    const openMembers=pRows.filter(p=>Math.abs(p.amount)>0.005);
    const headline=live && openMembers.length===0
      ? `${card('Parking Status','Settled','no open parking balance')}${card('Parking Fund Impact',money(total),'net parking activity in this scope')}${card('Parking Sales',money(sales),'parking money received')}${card('Parking Costs',money(costs),'parking purchases/costs',costs<0?'neg':'')}`
      : `${card('Open Parking Members',String(openMembers.length),'members with non-zero parking net')}${card('Parking Fund Impact',money(total),'net parking activity in this scope',total<0?'neg':'')}${card('Parking Sales',money(sales),'parking money received')}${card('Parking Costs',money(costs),'parking purchases/costs',costs<0?'neg':'')}`;
    layout('Parking','Parking Money Tracker','Parking is tracked by member. This page answers who has parking activity, what has been sold, and whether parking money affects the fund.',`${seasonSelectorBlock()}<p class="eyebrow" style="margin-top:26px">Parking Summary</p><div class="grid two">${headline}</div>${dennisView()?notice((live?scopeNote('Parking tracker')+' ':'')+'<b>Parking rule:</b> parking is member-level. For 2026 there are four fund shares for cost allocation: Dennis, Joel, Kyle, and Dennis x 2; Dennis x 2 is rolled into Dennis on member-facing totals. Parking should not affect seat columns.'):''}<p class="eyebrow" style="margin-top:26px">Member Parking Balances</p><div class="grid">${pRows.map(p=>card(p.name,money(p.amount),p.amount===0?'settled / no open balance':`${p.count} parking ledger rows`,p.amount<0?'neg':'')).join('')}</div><p class="eyebrow" style="margin-top:26px">Parking Activity Rows</p>${live?memberActivityTable(parkingRows.sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))),20):refreshBlock()}${dennisView()?`<details class="card"><summary><b>Manager audit: parking totals</b></summary>${live?table(['Member','Parking Total','Rows Hit'],pRows.map(p=>[p.name,money(p.amount),p.count])):''}</details>`:''}`);
    bindSeasonSelector(); bindRefresh();
  }
  function renderHistory(){
    const live=ledgerAvailable();
    if(!live){
      layout('History','Fund Activity Timeline','A member-friendly activity feed will appear here after OneDrive or the public snapshot loads.',`${refreshBlock()}<p class="eyebrow" style="margin-top:26px">IU Season History</p>${table(['Season','Record','Games','Note'],DATA.history.map(h=>[h.season,h.record,h.games,h.note]))}<p class="eyebrow" style="margin-top:26px">2025 Championship Run</p>${table(['Date','Game','Result','Flag'],DATA.postseason2025.map(g=>[g.date,g.game,g.result,g.flag]))}`);
      bindRefresh();
      return;
    }
    const rows=scopeRows();
    const summary=activitySummary(rows);
    const all=activityRows('All',40);
    const sales=activityRows('Sale / Resale',20);
    const parking=activityRows('Parking',20);
    const costs=activityRows('Cost / Purchase',20);
    const adjustments=activityRows('Adjustment',20);
    layout('History','Fund Activity Timeline','A member-friendly view of what happened: sales, costs, parking, adjustments, and season history.',`${seasonSelectorBlock()}<div class="grid">${card('Sales / Resales',money(summary.sales),'ticket + parking sale/resale proceeds')}${card('Parking Activity',money(summary.parking),'parking sales, costs, and usage',summary.parking<0?'neg':'')}${card('Costs / Purchases',money(summary.costs),'season, postseason, fees, travel',summary.costs<0?'neg':'')}${card('Adjustments',money(summary.adjustments),'top-offs, credits, reimbursements, reversals',summary.adjustments<0?'neg':'')}${card('Rows in Scope',String(summary.count),'transactions feeding this view')}${card('Current Scope',selectedSeasonLabel(),'use selector to switch seasons')}</div>${dennisView()?notice(scopeNote('History timeline')+' This page hides transaction IDs in the main activity feed and focuses on category, amount, event, and date.'):''}<p class="eyebrow" style="margin-top:26px">Recent Fund Activity</p>${memberActivityTable(all,25)}<p class="eyebrow" style="margin-top:26px">Ticket Sales / Resales</p>${memberActivityTable(sales,15)}<p class="eyebrow" style="margin-top:26px">Parking Activity</p>${memberActivityTable(parking,15)}<p class="eyebrow" style="margin-top:26px">Costs, Purchases, and Adjustments</p>${memberActivityTable([...costs,...adjustments].sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))),20)}<p class="eyebrow" style="margin-top:26px">IU Season History</p>${table(['Season','Record','Games','Note'],DATA.history.map(h=>[h.season,h.record,h.games,h.note]))}<p class="eyebrow" style="margin-top:26px">2025 Championship Run</p>${table(['Date','Game','Result','Flag'],DATA.postseason2025.map(g=>[g.date,g.game,g.result,g.flag]))}`);
    bindSeasonSelector();
    bindRefresh();
  }
  function renderSettle(){
    const live=ledgerAvailable();
    const balances=live?memberBalances():DATA.activeFunds.map(f=>({name:f.name,amount:f.balance,recent:0}));
    const rows=live?settlementRows():[];
    const fundPos=live?fundPositionFromBalances(balances):0;
    const fundTone=fundPos<0?'neg':'';
    const fundText=fundPos>0.005?'cash/proceeds to distribute or carry forward':fundPos<-0.005?'selected scope is underfunded':'fund depleted / no balance in this scope';
    layout('Settlement','Member Settlement Report','This view converts the live ledger into member balances, ticket-fund position, and a practical fund settlement plan.',`${seasonSelectorBlock()}<div class="grid">${balances.map(b=>card(b.name,money(b.amount),`${b.recent||0} ledger rows`,b.amount<0?'neg':'')).join('')}${card('Ticket Fund Position',money(fundPos),fundText,fundTone)}</div>${live?(dennisView()?notice(scopeNote('Live settlement')+' <b>Positive member balance means this member is owed money back from the fund. Negative member balance means this member owes money into the fund.</b> For 2026, Dennis confirmed everyone is fully paid, so the fund starts at $0 and stays depleted until the first sale. Dennis_x2 is rolled into Dennis on the member view, but it is still treated as its own 2026 fund share for cost allocation.'):''):refreshBlock()}<p class="eyebrow" style="margin-top:26px">Suggested Fund Settlement</p>${rows.length?table(['From','To','Amount','Reason'],rows):notice('<b>No settlement transfers needed:</b> this scope is already settled at $0.00.')}${dennisView()?`<p class="eyebrow" style="margin-top:26px">Member Balance Audit</p>${live?settlementAuditTable():''}<p class="eyebrow" style="margin-top:26px">Rows Included</p>${live?auditTxnTable(scopeRows(),20):''}${live?transactionFiltersBlock(20):''}`:''}`);
    bindSeasonSelector(); bindRefresh(); bindFilters();
  }

  function selectedPreset(){return presets[$('#txPreset').value]||presets.adjustment;}
  function seasonFromDate(d){return d?Number(String(d).slice(0,4)):2026;}
  function memberAmounts(amount,names){const out={Dennis:0,Joel:0,Kyle:0,Seth:0,Dennis_x2:0,DennisSeat1:0,JoelSeat:0,KyleSeat:0,SethSeat:0,DennisSeat2:0}; names.forEach(n=>out[n]=round2(amount/names.length)); return out;}
  function allocation(owner, allocationType, assetType, amount, season=activeSeason()){
    const out={Dennis:0,Joel:0,Kyle:0,Seth:0,Dennis_x2:0,DennisSeat1:0,JoelSeat:0,KyleSeat:0,SethSeat:0,DennisSeat2:0,allocationType};
    if(owner==='All Members') return {...out,...memberAmounts(amount,activeMemberKeysForSeason(season)),allocationType:'Member Split'};
    if(owner==='Dennis Joel Kyle') return {...out,...memberAmounts(amount,['Dennis','Joel','Kyle']),allocationType:'Dennis Joel Kyle Split'};
    if(owner==='All Active Seats'){
      const seats=activeSeatKeysForSeason(season);
      const seatAmounts=memberAmounts(amount,seats);
      const per=round2(amount/seats.length);
      return {...out,...seatAmounts,Dennis:round2((seats.includes('DennisSeat1')?per:0)+(seats.includes('DennisSeat2')?per:0)),Joel:seats.includes('JoelSeat')?per:0,Kyle:seats.includes('KyleSeat')?per:0,Seth:seats.includes('SethSeat')?per:0,Dennis_x2:seats.includes('DennisSeat2')?per:0,allocationType:'Seat Split'};
    }
    const key=owner==='Dennis x 2'?'Dennis_x2':owner; if(key in out) out[key]=amount;
    if(owner==='Dennis') out.DennisSeat1=amount; if(owner==='Joel') out.JoelSeat=amount; if(owner==='Kyle') out.KyleSeat=amount; if(owner==='Seth') out.SethSeat=amount; if(owner==='Dennis x 2') out.DennisSeat2=amount;
    return out;
  }
  function applyPreset(){const p=selectedPreset(); $('#txAsset').value=p.assetType; $('#txCategory').value=p.category; $('#txType').value=p.transactionType; $('#txAllocation').value=p.allocationType; $('#txOwner').value=p.owner; if(!$('#txDesc').value || $('#txDesc').value==='Manual adjustment') $('#txDesc').value=p.description; const amt=$('#txAmount'); const n=Number(amt.value||0); if(p.sign==='negative'&&n>0)amt.value=String(-Math.abs(n)); if(p.sign==='positive'&&n<0)amt.value=String(Math.abs(n)); const hint=$('#presetHint'); if(hint)hint.textContent=p.hint||''; if($('#reversalBox'))$('#reversalBox').style.display=($('#txPreset').value==='reversal'?'block':'none');}
  function buildTransactionPreview(){
    const date=$('#txDate').value||new Date().toISOString().slice(0,10); const assetType=$('#txAsset').value; const amount=round2($('#txAmount').value||0); const owner=$('#txOwner').value; const description=($('#txDesc').value||'').trim(); const season=Number($('#txSeason').value||seasonFromDate(date)); const allocationType=$('#txAllocation').value; const category=$('#txCategory').value; const transactionType=$('#txType').value; const gameId=($('#txGameId').value||'').trim(); const game=($('#txGame').value||'').trim(); const notes=($('#txNotes').value||'').trim();
    const a=allocation(owner,allocationType,assetType,amount,season); return {date,sourceYear:season,sourceRow:'',season,gameId,game,assetType,category,transactionType,description,allocationType:a.allocationType,totalAmount:amount,owner,notes,allocation:a};
  }
  function validationErrors(p){const errs=[]; const preset=selectedPreset(); if(!p.date)errs.push('Transaction date is required.'); if(!p.description)errs.push('Description is required.'); if(!Number.isFinite(p.totalAmount)||p.totalAmount===0)errs.push('Amount must be a non-zero number.'); if(p.assetType==='Parking'&&!['Member Split','Dennis Joel Kyle Split','Member Specific'].includes(p.allocationType))errs.push('Parking should be allocated at member level, not seat level.'); if(['Ticket Purchase','Parking Purchase','Future Season Ticket','Postseason Purchase','Reimbursement'].includes(p.category)&&p.totalAmount>0)errs.push('This preset usually writes as a negative amount.'); if(['Sale','Postseason Resale','Manual Top-off'].includes(p.category)&&p.totalAmount<0)errs.push('This preset usually writes as a positive amount.'); if(p.assetType==='Game Ticket'&&p.allocationType==='Member Split')errs.push('Game tickets should usually be seat split or seat-owner only.'); if(p.category==='Test'&&!/test/i.test(p.description))errs.push('Test preset description should include TEST so it is easy to clean up.'); if(preset.label.startsWith('Reversal')&&!/reversal/i.test(p.description))errs.push('Reversal description should identify the original transaction.'); if(!connection.connected)errs.push('Connect OneDrive before appending.'); if(!connection.isManager)errs.push('Only the configured manager can append rows.'); return errs;}
  function buildTransactionRow(txnId,p){const a=p.allocation; return [txnId,p.sourceYear,p.sourceRow,p.date,p.season,p.gameId,p.game,p.assetType,p.category,p.transactionType,p.description,p.allocationType,p.totalAmount,a.Dennis,a.Joel,a.Kyle,a.Seth,a.Dennis_x2,a.DennisSeat1,a.JoelSeat,a.KyleSeat,a.SethSeat,a.DennisSeat2,'No','',p.notes||'Entered from Hoosier Ticket Command Center web app'];}
  function profileStatus(){if(!connection.connected)return '<b>Status:</b> Not connected. Click Connect OneDrive before writing.'; const email=userEmail(connection.profile); return `<b>Status:</b> Connected as ${email||'Microsoft account'} · ${connection.isManager?'Manager writeback enabled':'Read-only; not manager account'}`;}
  function renderManagerFull(){layout('Manager','Real Transaction Workflow','Use presets to build clean rows, preview the allocation, or create a reversal instead of deleting history.',`<div class="card"><div class="notice">${profileStatus()}</div><div class="form"><label>Preset<select id="txPreset">${Object.entries(presets).map(([k,p])=>`<option value="${k}">${p.label}</option>`).join('')}</select></label><label>Transaction date<input type="date" id="txDate"></label><label>Season<input id="txSeason" type="number" value="2026"></label><label>Game ID<input id="txGameId" placeholder="ex: 2026-01"></label><label class="wide">Game / event<input id="txGame" placeholder="ex: IU vs Purdue"></label><label>Asset type<select id="txAsset"><option>Game Ticket</option><option>Parking</option><option>Fee</option><option>Adjustment</option><option>Travel</option><option>Fund</option></select></label><label>Category<input id="txCategory" value="Manual Entry"></label><label>Transaction type<input id="txType" value="Manual Entry"></label><label>Allocation type<select id="txAllocation"><option>Member Specific</option><option>Seat Owner Only</option><option>Seat Split</option><option>Member Split</option><option>Dennis Joel Kyle Split</option></select></label><label>Owner / split<select id="txOwner"><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Seth</option><option>Dennis x 2</option><option>All Members</option><option>All Active Seats</option><option>Dennis Joel Kyle</option></select></label><label>Amount<input id="txAmount" type="number" step="0.01" placeholder="0.00"></label><label class="wide">Description<textarea id="txDesc" placeholder="Example: IU vs Purdue parking resale"></textarea></label><label class="wide">Notes<textarea id="txNotes" placeholder="Optional notes"></textarea></label></div><div class="notice"><b>Preset guide:</b> <span id="presetHint"></span></div><div class="notice" id="reversalBox" style="display:none"><b>Reversal helper:</b> select a recent transaction and click Build Reversal. This creates an offsetting row while preserving the original.<br><select id="reverseTxn"><option value="">Choose transaction</option>${liveLedger.loaded?reversalOptions():''}</select> <button class="btn small" id="buildReversalBtn">Build reversal</button></div><p><button class="btn" id="previewBtn">Preview row</button> <button class="btn" id="appendBtn">Append to OneDrive table</button> <button class="btn" id="refreshManagerBtn">Refresh workbook</button></p><pre class="notice" id="previewBox">No row preview yet.</pre><div id="allocationPreview"></div><div class="notice"><b>Tip:</b> Sales/resales should usually be positive. Purchases, reimbursements, fees, and season payments should usually be negative. Use reversals for mistakes instead of deleting rows.</div></div><div class="card"><h3>Publish Member Snapshot</h3><p>Use this after you add or change transactions so Joel and Kyle see the latest read-only member dashboard.</p><div class="notice"><b>Publish checklist</b><ol style="margin:8px 0 0 20px;padding:0"><li>Click <b>Refresh workbook</b> so this page has the latest OneDrive rows.</li><li>Review Score, Money, Seats, Parking, and Settle in manager mode.</li><li>Click <b>Download public-ledger.json</b>.</li><li>In GitHub, replace only <b>data/public-ledger.json</b> with the downloaded file.</li><li>Open the normal member link in incognito and confirm the snapshot timestamp updated.</li></ol></div><p><button class="btn" id="publishSnapshotBtn">Download public-ledger.json</button></p><div class="notice"><b>Do not upload app patch placeholder data over the member snapshot.</b> During normal code patches, preserve <b>data/public-ledger.json</b>. Only replace it when you intentionally publish a new member snapshot.</div><div class="notice"><b>Privacy warning:</b> if your GitHub Pages site is public, this snapshot is public to anyone with the link.</div></div>${transactionFiltersBlock(20)}`); setTimeout(bindManager,0); bindRefresh(); setTimeout(bindFilters,0);}
  function renderManager(){
    if(!connection.isManager){
      const mode=viewModeLabel();
      layout('Manager','Manager Tools','Manager writeback and snapshot publishing are reserved for Dennis.',`${notice('<b>'+mode.title+':</b> '+mode.body)}<div class="grid two">${card('View Mode',connection.connected?'Signed in read-only':(publicSnapshot.loaded?'Public snapshot':'Fallback'),connection.isManager?'manager':'member/read-only')}${card('Writeback','Disabled','only '+(managerEmail()||'the configured manager')+' can append rows')}${card('Snapshot','Read-only','Joel and Kyle can view without OneDrive')}</div>${notice('<b>For Dennis:</b> click Connect OneDrive in the header and sign in with the configured manager account to unlock transaction entry and snapshot publishing.')}<p class="eyebrow" style="margin-top:26px">Recent Fund Activity</p>${recentTransactionsBlock(8)}`);
      return;
    }
    return renderManagerFull();
  }

  function buildReversalFromSelected(){const id=$('#reverseTxn').value; const t=txnById(id); if(!t){alert('Choose a transaction to reverse.'); return;} $('#txDate').value=new Date().toISOString().slice(0,10); $('#txSeason').value=t.Season||seasonFromDate(t.TxnDate); $('#txGameId').value=t.GameID||''; $('#txGame').value=t.Game||''; $('#txAsset').value=t.AssetType||'Adjustment'; $('#txCategory').value='Reversal'; $('#txType').value='Reversal'; $('#txAllocation').value=t.AllocationType||'Member Specific'; $('#txAmount').value=String(round2(-Number(t.TotalAmount||0))); $('#txDesc').value='Reversal of '+t.TxnID+' - '+(t.Description||t.Game||'transaction'); $('#txNotes').value='Reversal created from Hoosier Ticket Command Center for '+t.TxnID; const members=['Dennis','Joel','Kyle','Seth','Dennis_x2','DennisSeat1','JoelSeat','KyleSeat','SethSeat','DennisSeat2']; const largest=members.map(m=>[m,Math.abs(Number(t[m]||0))]).sort((a,b)=>b[1]-a[1])[0]; const map={Dennis:'Dennis',Joel:'Joel',Kyle:'Kyle',Seth:'Seth',Dennis_x2:'Dennis x 2',DennisSeat1:'Dennis',JoelSeat:'Joel',KyleSeat:'Kyle',SethSeat:'Seth',DennisSeat2:'Dennis x 2'}; if(largest&&largest[1]>0)$('#txOwner').value=map[largest[0]]||'Dennis'; previewCurrent();}
  function previewCurrent(){const p=buildTransactionPreview(); const errs=validationErrors(p); $('#previewBox').textContent=JSON.stringify({readyToAppend:errs.length===0,validation:errs,preview:p,rowShape:buildTransactionRow('TXN-NEXT',p)},null,2); $('#allocationPreview').innerHTML='<p class="eyebrow" style="margin-top:18px">Allocation preview</p>'+allocationPreviewTable(p);}
  function bindManager(){const today=new Date().toISOString().slice(0,10); $('#txDate').value=today; $('#txPreset').onchange=applyPreset; applyPreset(); $('#previewBtn').onclick=previewCurrent; $('#buildReversalBtn')&&($('#buildReversalBtn').onclick=buildReversalFromSelected); $('#refreshManagerBtn').onclick=async()=>{await refreshLedger(); show('manager');}; const ps=$('#publishSnapshotBtn'); if(ps)ps.onclick=downloadPublicSnapshot; $('#appendBtn').onclick=async()=>{try{if(!window.HTCC_GRAPH||!window.HTCC_GRAPH.appendTransaction)throw new Error('Graph writeback client not loaded.'); const p=buildTransactionPreview(); const errs=validationErrors(p); if(errs.length)throw new Error(errs.join(' ')); if(!confirm('Append '+money(p.totalAmount)+' as '+p.category+' / '+p.allocationType+'?')) return; $('#previewBox').textContent='Appending row to OneDrive...'; const txnId=await window.HTCC_GRAPH.nextTransactionId(); const row=buildTransactionRow(txnId,p); const result=await window.HTCC_GRAPH.appendTransaction(row); liveLedger.lastWrite={txnId,row,result,at:new Date()}; await refreshLedger(); $('#previewBox').textContent=JSON.stringify({status:'Appended and refreshed from OneDrive TransactionsTable',txnId,row,graphResult:result,liveRows:liveLedger.transactions.length},null,2); alert('Appended '+txnId+' and refreshed workbook data.'); show('manager');}catch(e){console.error('Append failed',e); $('#previewBox').textContent='Append failed: '+(e.message||String(e)); alert('Append failed: '+(e.message||String(e)));}};}

  function normalizePublicTxn(row){
    if(Array.isArray(row)){const obj={}; TXN_COLUMNS.forEach((c,i)=>obj[c]=row[i]); return obj;}
    if(row && row.values && row.values[0]) return rowToTxn(row);
    const obj={}; TXN_COLUMNS.forEach(c=>obj[c]=(row&&row[c]!==undefined)?row[c]:''); return obj;
  }
  async function loadPublicSnapshot(){
    if(connection.connected) return;
    try{
      const url='data/public-ledger.json?v='+(Date.now());
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) return;
      const json=await res.json();
      const rows=json.transactions||json.rows||json.value||[];
      const tx=rows.map(normalizePublicTxn).filter(t=>t && (t.TxnID || t.Description || t.Game));
      if(tx.length){
        liveLedger.transactions=tx;
        liveLedger.loaded=true;
        liveLedger.lastLoaded=new Date(json.meta&&json.meta.publishedAt?json.meta.publishedAt:Date.now());
        publicSnapshot={loaded:true,error:null,meta:json.meta||{}};
      }
    }catch(e){
      publicSnapshot={loaded:false,error:e,meta:null};
      console.warn('Public snapshot not loaded',e);
    }finally{setMode();}
  }
  function buildPublicSnapshot(){
    const rows=liveLedger.transactions.map(t=>{const obj={}; TXN_COLUMNS.forEach(c=>obj[c]=(t[c]===undefined?'' : t[c])); return obj;});
    const s=liveStats();
    return {meta:{format:'HTCC_PUBLIC_LEDGER_SNAPSHOT_V2',publishedAt:new Date().toISOString(),rowCount:rows.length,latestTxn:s.lastTxn,latestDate:s.lastDate,summary:buildMemberSummary(),notice:'Read-only member dashboard snapshot. Public if hosted on public GitHub Pages.'},columns:TXN_COLUMNS,transactions:rows};
  }
  function downloadPublicSnapshot(){
    try{
      if(!liveLedger.loaded || !liveLedger.transactions.length){alert('Load the workbook before publishing a member snapshot.'); return;}
      if(!connection.isManager){alert('Only the manager account can publish the member snapshot.'); return;}
      const snapshot=buildPublicSnapshot();
      const json=JSON.stringify(snapshot,null,2);
      const blob=new Blob([json],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='public-ledger.json';
      a.rel='noopener';
      a.style.display='none';
      document.body.appendChild(a);
      a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      setTimeout(()=>{try{URL.revokeObjectURL(url);}catch(_){ } try{a.remove();}catch(_){ }},4000);
      showSnapshotFallback(json,url);
    }catch(e){
      console.error('Snapshot download failed',e);
      alert('Snapshot download failed: '+(e.message||String(e))+'. A copy/paste fallback will be shown if possible.');
    }
  }
  function showSnapshotFallback(json,url){
    const btn=$('#publishSnapshotBtn');
    if(!btn) return;
    let box=$('#snapshotDownloadFallback');
    if(!box){
      box=document.createElement('div');
      box.id='snapshotDownloadFallback';
      box.className='notice';
      btn.closest('.card')?.appendChild(box);
    }
    box.innerHTML=`<b>Snapshot ready:</b> if your browser did not download automatically, use the backup link below or copy the JSON into <b>data/public-ledger.json</b> in GitHub.<p><a class="btn small" download="public-ledger.json" href="${url}">Download backup link</a> <button class="btn small" id="copySnapshotJsonBtn">Copy JSON</button></p><textarea id="snapshotJsonText" style="width:100%;min-height:180px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px">${escapeHtml(json)}</textarea>`;
    const copy=$('#copySnapshotJsonBtn');
    if(copy) copy.onclick=async()=>{try{await navigator.clipboard.writeText(json); alert('Snapshot JSON copied.');}catch(e){const t=$('#snapshotJsonText'); if(t){t.focus(); t.select();} alert('Copy blocked by browser. The JSON box is selected so you can copy it manually.');}};
  }


  const renderers={score:renderScore,money:renderMoney,seats:renderSeats,parking:renderParking,history:renderHistory,settle:renderSettle,manager:renderManager};
  function scrollToPageTop(){try{window.scrollTo({top:0,left:0,behavior:'auto'}); document.documentElement.scrollTop=0; document.body.scrollTop=0;}catch(e){}}
  function show(id, scrollTop){try{if(id==='manager'&&!dennisView()) id='score'; const changingPage=id!==current; if(changingPage) selectedSeason='active'; current=id; renderNav(); document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.screen===id)); (renderers[id]||renderScore)(); if(scrollTop) requestAnimationFrame(scrollToPageTop);}catch(err){console.error('HTCC render failure',id,err); $('#app').innerHTML=`<section><p class="eyebrow">App error</p><h2>Something failed to render</h2>${notice('<b>Error:</b> '+(err&&err.message?err.message:String(err)),'danger')}</section>`;}}
  async function connectOneDrive(){
    if(connection.connected){ await refreshLedger(); setMode(); show(current); return; }
    if(!window.HTCC_GRAPH)throw new Error('Graph client not loaded');
    const res=await window.HTCC_GRAPH.connect(); connection.connected=true; connection.profile=res.profile||null; const email=userEmail(connection.profile); connection.isManager=!!email&&email===managerEmail(); await refreshLedger(); setMode(); show(current); alert('Connected as '+(email||'Microsoft account')+(connection.isManager?' · Manager writeback enabled':' · Read-only account')+'. Workbook rows loaded: '+(liveLedger.transactions.length||0));
  }
  function init(){try{setMode(); renderNav(); const n=$('#bottomNav'); n.onclick=e=>{const b=e.target.closest('button[data-screen]'); if(b)show(b.dataset.screen,true);}; const cb=$('#connectBtn'); if(cb)cb.onclick=async()=>{try{await connectOneDrive();}catch(e){alert(e.message||String(e));}}; show('score'); loadPublicSnapshot().then(()=>{setMode(); if(publicSnapshot.loaded)show(current);});}catch(e){console.error(e); $('#app').innerHTML=`<div class="notice danger"><b>Startup failed:</b> ${e.message||String(e)}</div>`;}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
