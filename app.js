(function(){
  const VERSION = 'v3.0.0-consolidated';
  const TXN_COLUMNS = ['TxnID','SourceYear','SourceRow','TxnDate','Season','GameID','Game','AssetType','Category','TransactionType','Description','AllocationType','TotalAmount','Dennis','Joel','Kyle','Seth','Dennis_x2','DennisSeat1','JoelSeat','KyleSeat','SethSeat','DennisSeat2','NeedsReview','ReviewReason','Notes','MoneyType'];

  // Static reference facts about the team/season. Not financial data, so it
  // doesn't need to come from the ledger.
  const DATA = {
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

  // Who's in the group and which of the 4 physical seats they hold, and when.
  // Mirrors the workbook's Members / Seat Accounts sheets. Dennis holds two
  // seats starting 2026 (Seat 2 replaces what used to be Seth's seat).
  const MEMBERS = [
    {key:'Dennis',label:'Dennis',activeFrom:2021,activeTo:null},
    {key:'Joel',label:'Joel',activeFrom:2021,activeTo:null},
    {key:'Kyle',label:'Kyle',activeFrom:2021,activeTo:null},
    {key:'Seth',label:'Seth',activeFrom:2021,activeTo:2025}
  ];
  const SEATS = [
    {key:'DennisSeat1',label:'Dennis Seat 1',owner:'Dennis',fundShareColumn:'Dennis',activeFrom:2021,activeTo:null},
    {key:'JoelSeat',label:'Joel Seat',owner:'Joel',fundShareColumn:'Joel',activeFrom:2021,activeTo:null},
    {key:'KyleSeat',label:'Kyle Seat',owner:'Kyle',fundShareColumn:'Kyle',activeFrom:2021,activeTo:null},
    {key:'SethSeat',label:'Seth Seat',owner:'Seth',fundShareColumn:'Seth',activeFrom:2021,activeTo:2025},
    {key:'DennisSeat2',label:'Dennis Seat 2 (2nd seat)',owner:'Dennis',fundShareColumn:'Dennis_x2',activeFrom:2026,activeTo:null}
  ];
  const activeIn=(entity,season)=>Number(season)>=entity.activeFrom && (entity.activeTo==null || Number(season)<=entity.activeTo);
  const activeMembersForSeason=(season)=>MEMBERS.filter(m=>activeIn(m,season));
  const activeSeatsForSeason=(season)=>SEATS.filter(s=>activeIn(s,season));

  // What kind of money a transaction represents. Set explicitly on every row
  // (by Dennis, at entry time) instead of guessed from free-text category
  // strings at render time.
  const MONEY_TYPES = {
    TicketSale:{label:'Ticket Sale / Resale',group:'sales'},
    ParkingSale:{label:'Parking Sale / Resale',group:'sales'},
    TicketCost:{label:'Ticket Cost',group:'costs'},
    ParkingCost:{label:'Parking Cost',group:'costs'},
    OtherCost:{label:'Other Cost',group:'costs'},
    MemberFunding:{label:'Member Funding / Top-off',group:'funding'},
    SharedOpportunity:{label:'Shared Opportunity',group:'shared'},
    Unclassified:{label:'Needs classification',group:'unclassified'}
  };
  const moneyType=t=>MONEY_TYPES[t.MoneyType]?t.MoneyType:'Unclassified';
  const moneyTypeLabel=t=>MONEY_TYPES[moneyType(t)].label;
  const moneyTypeGroup=t=>MONEY_TYPES[moneyType(t)].group;

  const presets={
    ticketSale:{label:'Ticket sale',moneyType:'TicketSale',assetType:'Game Ticket',category:'Sale',transactionType:'Ticket Sale',allocationType:'Seat Owner Only',owner:'Dennis',sign:'positive',description:'Ticket sale',hint:'Use when a member or seat owner sells game tickets.'},
    parkingSale:{label:'Parking sale',moneyType:'ParkingSale',assetType:'Parking',category:'Sale',transactionType:'Parking Sale',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'Parking sale',hint:'Use when one member sells or uses a parking pass.'},
    ticketPurchase:{label:'Game ticket purchase',moneyType:'TicketCost',assetType:'Game Ticket',category:'Ticket Purchase',transactionType:'Ticket Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Game ticket purchase',hint:'Use for a shared game-ticket cost split across active seats.'},
    parkingPurchase:{label:'Parking purchase',moneyType:'ParkingCost',assetType:'Parking',category:'Parking Purchase',transactionType:'Parking Purchase',allocationType:'Member Split',owner:'All Members',sign:'negative',description:'Parking purchase',hint:'Use for parking cost split across members.'},
    seasonPayment:{label:'Season-ticket payment',moneyType:'TicketCost',assetType:'Game Ticket',category:'Future Season Ticket',transactionType:'Season Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Season-ticket payment',hint:'Use for IU season ticket payment/installment.'},
    postseasonPurchase:{label:'Postseason purchase',moneyType:'TicketCost',assetType:'Game Ticket',category:'Postseason Purchase',transactionType:'Postseason Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Postseason ticket purchase',hint:'Use for bowl/playoff/championship purchase.'},
    postseasonResale:{label:'Postseason resale',moneyType:'TicketSale',assetType:'Game Ticket',category:'Postseason Resale',transactionType:'Postseason Resale',allocationType:'Seat Split',owner:'All Active Seats',sign:'positive',description:'Postseason resale',hint:'Use for resale proceeds from postseason tickets.'},
    manualTopoff:{label:'Manual top-off / donation',moneyType:'MemberFunding',assetType:'Adjustment',category:'Manual Top-off',transactionType:'Fund Donation',allocationType:'Dennis Joel Kyle Split',owner:'Dennis Joel Kyle',sign:'positive',description:'Manual top-off',hint:'Use when adding donated/top-off money to the fund.'},
    reimbursement:{label:'Reimbursement',moneyType:'OtherCost',assetType:'Adjustment',category:'Reimbursement',transactionType:'Reimbursement',allocationType:'Member Specific',owner:'Dennis',sign:'negative',description:'Reimbursement paid from fund',hint:'Use when the fund reimburses a member.'},
    sharedOpportunity:{label:'Shared opportunity buy/resale',moneyType:'SharedOpportunity',assetType:'Game Ticket',category:'Shared Opportunity',transactionType:'Purchase/Resale',allocationType:'Dennis Joel Kyle Split',owner:'Dennis Joel Kyle',sign:'negative',description:'Shared opportunity purchase',hint:'Use for a one-off shared buy/resale (postseason, away game, single-game purchase) split evenly Dennis/Joel/Kyle regardless of seat ownership. Still counts toward the same overall fund balance.'},
    adjustment:{label:'Adjustment',moneyType:'OtherCost',assetType:'Adjustment',category:'Adjustment',transactionType:'Manual Adjustment',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'Manual adjustment',hint:'Use sparingly for manual corrections.'},
    reversal:{label:'Reversal / correction',moneyType:'OtherCost',assetType:'Adjustment',category:'Reversal',transactionType:'Reversal',allocationType:'Member Specific',owner:'Dennis',sign:'opposite',description:'Reversal of prior transaction',hint:'Preferred way to undo a row while preserving audit trail.'}
  };

  const allScreens=[['home','🏠','Home'],['activity','📋','Activity'],['manager','✍️','Manager']];
  const visibleScreens=()=>allScreens.filter(([id])=>id!=='manager'||dennisView());
  function renderNav(){const n=$('#bottomNav'); if(!n) return; n.innerHTML=visibleScreens().map(([id,icon,label])=>`<button class="navbtn" data-screen="${id}"><span>${icon}</span>${label}</button>`).join('');}
  let current='home';
  let connection={connected:false,isManager:false,profile:null};
  let liveLedger={loaded:false,loading:false,error:null,lastLoaded:null,transactions:[],lastWrite:null};
  let publicSnapshot={loaded:false,error:null,meta:null};
  let selectedSeason='active';
  let activityGroupBy='none';

  const $=s=>document.querySelector(s);
  const money=n=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  // Math.round() always rounds .5 toward +Infinity, so round2(-18.375) would
  // give -18.37 while round2(18.375) gives 18.38 - a 1-cent asymmetry on any
  // exact half-cent split (e.g. a cost divided 4 ways landing on X.XX5).
  // Round half-away-from-zero instead so a cost and its mirrored credit
  // cancel to exactly $0.00 rather than drifting a cent apart.
  const round2=v=>{const n=Number(v||0); return (n<0?-Math.round(-n*100):Math.round(n*100))/100;};
  const SETTLED_TOLERANCE = 1.00;
  const closeToZero = v => Math.abs(Number(v||0)) <= SETTLED_TOLERANCE;
  const settledAmount = v => closeToZero(v) ? 0 : round2(v);
  const escapeHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]||ch));

  const cfg=()=>window.HTCC_CONFIG||{};
  const graphConfigured=()=>cfg().authMode==='graph'||cfg().graphEnabled===true;
  const managerRequested=()=>new URLSearchParams(window.location.search).get('manager')==='1';
  const publicMemberView=()=>!managerRequested()&&!connection.connected;
  const dennisView=()=>managerRequested()||connection.connected;
  const ready=()=>window.HTCC_GRAPH&&window.HTCC_GRAPH.msalReady&&window.HTCC_GRAPH.msalReady();
  const userEmail=profile=>String((profile&&(profile.mail||profile.userPrincipalName))||'').toLowerCase();
  const managerEmail=()=>String(cfg().managerEmail||'').toLowerCase();

  function fmtDateTime(iso){
    if(!iso) return 'not published yet';
    const d=new Date(iso);
    if(Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function dataUpdatedText(){
    if(connection.connected && liveLedger.lastLoaded) return 'Live workbook refreshed '+fmtDateTime(liveLedger.lastLoaded.toISOString?liveLedger.lastLoaded.toISOString():liveLedger.lastLoaded);
    if(publicSnapshot.loaded && publicSnapshot.meta && publicSnapshot.meta.publishedAt) return 'Updated '+fmtDateTime(publicSnapshot.meta.publishedAt);
    if(!managerRequested()) return 'Snapshot pending';
    return '';
  }
  function setFooter(){const el=$('#footerUpdated'); if(el) el.textContent=dataUpdatedText();}
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
  function layout(eyebrow,title,lede,body){$('#app').innerHTML=`<section><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="lede">${lede}</p>${body}</section>`;}

  // ---------- ledger loading ----------
  function rowToTxn(row){
    const vals=(row&&row.values&&row.values[0])||[];
    const obj={}; TXN_COLUMNS.forEach((c,i)=>obj[c]=vals[i]); return obj;
  }
  function txDateValue(t){return t.TxnDate || '';}
  function txSortValue(t){return String(txDateValue(t)||'0000-00-00') + String(t.TxnID||'');}
  function recentTxns(limit=10){return [...liveLedger.transactions].sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))).slice(0,limit);}
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
  function bindRefresh(){const b=$('#refreshBtn'); if(b)b.onclick=async()=>{await refreshLedger(); show(current);};}
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

  // ---------- season / scope ----------
  function ledgerAvailable(){return liveLedger.loaded && liveLedger.transactions.length>0;}
  function txRows(){return ledgerAvailable()?liveLedger.transactions:[];}
  function activeSeason(){
    const seasons=txRows().map(t=>Number(t.Season||t.SourceYear||0)).filter(n=>Number.isFinite(n)&&n>2000);
    return seasons.length?Math.max(...seasons):2026;
  }
  function seasonRows(season=activeSeason()){return txRows().filter(t=>Number(t.Season||t.SourceYear||0)===Number(season));}
  // There is one fund and one balance per member. Regular-season ticket
  // money is attributed by seat (so Dennis, with two seats, gets two
  // shares); one-off shared buys (postseason, away games, single-game
  // purchases) are split evenly Dennis/Joel/Kyle instead. Both count toward
  // the same overall balance - SharedOpportunity is a label for *how* the
  // money was split, not a separate pool kept apart from the fund.
  function isSharedOpportunityRow(t){return moneyType(t)==='SharedOpportunity';}
  function fundScopeRows(season=selectedSeasonValue()){
    return season==='all'?txRows():seasonRows(season);
  }
  function sharedOpportunityRows(season=selectedSeasonValue()){
    const rows=season==='all'?txRows():seasonRows(season);
    return rows.filter(isSharedOpportunityRow);
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
  function selectedSeasonLabel(){const v=selectedSeasonValue(); return v==='all'?'All seasons':String(v);}
  function scopeRows(){if(!ledgerAvailable()) return []; const v=selectedSeasonValue(); return v==='all'?txRows():seasonRows(v);}
  function seasonSelectorBlock(){
    if(!ledgerAvailable()) return '';
    const years=availableSeasons();
    const opts=[['active','Active season ('+activeSeason()+')'],...years.map(y=>[String(y),String(y)]),['all','All seasons']];
    return `<div class="card season-card"><div class="form"><label>Season<select id="seasonSelect">${opts.map(([v,l])=>`<option value="${v}" ${String(selectedSeason)===String(v)?'selected':''}>${l}</option>`).join('')}</select></label><div class="sub">Showing ${selectedSeasonLabel()}.</div></div></div>`;
  }
  function bindSeasonSelector(){const el=$('#seasonSelect'); if(el)el.onchange=()=>{selectedSeason=el.value; show(current);};}

  // ---------- member / seat settlement math ----------
  function rowTotal(t){return Number(t.TotalAmount||0);}
  function memberKeysForCurrentScope(){
    const v=selectedSeasonValue();
    return (v==='all'?MEMBERS:activeMembersForSeason(v)).map(m=>m.key);
  }
  function memberLabel(key){const m=MEMBERS.find(x=>x.key===key); return m?m.label:key;}
  function rawPersonCredits(t,name){
    // Member columns represent cash/credit/proceeds attributed to that member.
    // Dennis's 2nd-seat money (Dennis_x2 column) rolls into Dennis here, since
    // it's the same person even though it's tracked as a separate fund share.
    if(name==='Seth' && sethDirectPayoutAmount(t)>0) return 0;
    return round2(Number(t[name]||0) + (name==='Dennis'?Number(t.Dennis_x2||0):0));
  }
  function rowCostImpact(t){
    if(moneyTypeGroup(t)==='costs') return round2(-Math.abs(rowTotal(t)));
    return 0;
  }
  function expenseShareByPerson(t,name){
    const total=rowCostImpact(t);
    if(total>=0) return 0;
    const alloc=String(t.AllocationType||'').toLowerCase();
    const season=Number(t.Season||t.SourceYear||activeSeason());
    if(alloc.includes('seat') || alloc.includes('member split')){
      // Round the owner's total share once, not per-seat-then-sum - rounding
      // each seat's fraction first and adding them can drift a cent off for
      // an owner with more than one seat (e.g. Dennis's two seats) whenever
      // the per-seat split lands on an exact half-cent.
      const seats=activeSeatsForSeason(season);
      const ownedCount=seats.filter(s=>s.owner===name).length;
      return round2(total*ownedCount/seats.length);
    }
    if(alloc.includes('dennis joel kyle')){
      return ['Dennis','Joel','Kyle'].includes(name)?round2(total/3):0;
    }
    if(alloc.includes('member specific') || alloc.includes('owner')){
      const members=activeMembersForSeason(season).map(m=>m.key);
      const ranked=members.map(m=>[m,Math.abs(rawPersonCredits(t,m))]).sort((a,b)=>b[1]-a[1]);
      const owner=ranked[0]&&ranked[0][1]>0?ranked[0][0]:'Dennis';
      return name===owner?total:0;
    }
    return 0;
  }
  function personAmount(rows,name){
    return round2(rows.reduce((bal,t)=>bal + rawPersonCredits(t,name) + expenseShareByPerson(t,name),0));
  }
  function personHitCount(rows,name){
    return rows.filter(t=>Math.abs(rawPersonCredits(t,name))+Math.abs(expenseShareByPerson(t,name))>0.005).length;
  }
  function memberBalances(){
    const rows=fundScopeRows();
    return memberKeysForCurrentScope().map(key=>({key,name:memberLabel(key),amount:settledAmount(personAmount(rows,key)),recent:personHitCount(rows,key)}));
  }
  function sethDirectPayoutAmount(t){
    const season=Number(t.Season||0);
    if(!(season===2024 || season===2025)) return 0;
    if(!(moneyType(t)==='TicketSale' || moneyType(t)==='ParkingSale')) return 0;
    const seth=Number(t.Seth||0);
    return seth>0 ? seth : 0;
  }
  function fundPositionFromBalances(balances=memberBalances()){
    return round2(balances.reduce((a,b)=>a+b.amount,0));
  }
  function settlementRows(){
    const balances=memberBalances();
    const rows=[];
    balances.forEach(b=>{
      if(b.amount>0.005) rows.push(['Ticket Fund',b.name,money(b.amount),'Fund owes this member']);
      if(b.amount<-0.005) rows.push([b.name,'Ticket Fund',money(-b.amount),'Member owes the shared fund']);
    });
    return rows;
  }
  // ---------- money summaries (by explicit MoneyType, no guessing) ----------
  function moneySummary(rows){
    const out={TicketSale:0,ParkingSale:0,TicketCost:0,ParkingCost:0,OtherCost:0,MemberFunding:0,SharedOpportunity:0,Unclassified:0,count:rows.length,unclassifiedCount:0};
    rows.forEach(t=>{
      const mt=moneyType(t);
      if(mt==='Unclassified') out.unclassifiedCount++;
      out[mt]=round2((out[mt]||0)+rowTotal(t));
    });
    out.sales=round2(out.TicketSale+out.ParkingSale);
    out.costs=round2(out.TicketCost+out.ParkingCost+out.OtherCost);
    out.total=round2(out.sales+out.costs+out.MemberFunding+out.SharedOpportunity+out.Unclassified);
    return out;
  }
  function rollForwardToNextSeason(year){
    if(!Number.isFinite(Number(year))) return 0;
    const next=Number(year)+1;
    return round2(seasonRows(next).filter(t=>moneyType(t)==='MemberFunding').reduce((a,t)=>a+rowTotal(t),0));
  }

  // ---------- game grouping (for Activity "group by game") ----------
  function gameKeyForTxn(t){
    const g=String(t.Game||'').trim();
    if(g) return g;
    const gid=String(t.GameID||'').trim();
    if(gid) return gid;
    return String(t.Description||t.TransactionType||'').trim() || 'Season / General';
  }
  function isRealGameRow(t){
    const key=gameKeyForTxn(t).toLowerCase().trim();
    if(!key || /^\d+$/.test(key)) return false;
    if(moneyType(t)==='MemberFunding') return false;
    if(/\bseason\b/.test(key) && !/(vs|bowl|championship|playoff|game|postseason)/.test(key)) return false;
    return true;
  }
  function gameGroups(rows){
    const map=new Map();
    rows.filter(isRealGameRow).forEach(t=>{
      const key=gameKeyForTxn(t);
      if(!map.has(key)) map.set(key,[]);
      map.get(key).push(t);
    });
    return [...map.entries()].map(([key,groupRows])=>{
      const dates=groupRows.map(t=>String(t.TxnDate||'')).filter(Boolean).sort();
      return {key,rows:groupRows,latest:dates[dates.length-1]||'',earliest:dates[0]||''};
    }).sort((a,b)=>b.latest.localeCompare(a.latest)||a.key.localeCompare(b.key));
  }

  // ---------- activity table + filters ----------
  function uniqueTxValues(field){return [...new Set(liveLedger.transactions.map(t=>t[field]).filter(v=>v!==undefined&&v!==null&&String(v).trim()!==''))].sort((a,b)=>String(a).localeCompare(String(b)));}
  function filteredTxns(){
    if(!ledgerAvailable()) return [];
    const moneyTypeFilter=$('#filterMoneyType')?$('#filterMoneyType').value:'All';
    const member=$('#filterMember')?$('#filterMember').value:'All';
    const search=String($('#filterSearch')?$('#filterSearch').value:'').toLowerCase();
    return scopeRows().filter(t=>{
      if(moneyTypeFilter!=='All' && moneyType(t)!==moneyTypeFilter) return false;
      if(member!=='All' && Number(t[member]||0)===0 && Number(t[member+'Seat']||0)===0) return false;
      if(search){ const hay=TXN_COLUMNS.map(c=>String(t[c]||'')).join(' ').toLowerCase(); if(!hay.includes(search)) return false; }
      return true;
    }).sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a)));
  }
  function activityFiltersBlock(){
    const opts=Object.entries(MONEY_TYPES).filter(([k])=>k!=='Unclassified').map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
    return `<div class="card"><div class="form compact"><label>Money type<select id="filterMoneyType"><option value="All">All</option>${opts}</select></label><label>Member<select id="filterMember"><option>All</option><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Seth</option></select></label><label class="wide">Search<input id="filterSearch" placeholder="game, description, TXN ID"></label></div><p><label><input type="radio" name="groupBy" value="none" ${activityGroupBy==='none'?'checked':''}> Flat list</label> &nbsp; <label><input type="radio" name="groupBy" value="game" ${activityGroupBy==='game'?'checked':''}> Group by game</label></p></div>`;
  }
  function bindFilters(){
    ['filterMoneyType','filterMember','filterSearch'].forEach(id=>{const el=$('#'+id); if(el){el.onchange=()=>show(current); if(id==='filterSearch')el.onkeyup=e=>{if(e.key==='Enter')show(current);};}});
    document.querySelectorAll('input[name="groupBy"]').forEach(r=>r.onchange=e=>{activityGroupBy=e.target.value; show(current);});
  }
  function activityTable(rows,limit=200){
    if(!rows.length) return notice('No transactions match the current filters.');
    return table(['Date','Money Type','Game/Event','Category','Amount'],rows.slice(0,limit).map(t=>[t.TxnDate||'',moneyTypeLabel(t),t.Game||t.Description||'',t.Category||t.TransactionType||'',money(rowTotal(t))]));
  }
  function auditTxnTable(rows,limit=20){
    const picked=[...rows].sort((a,b)=>txSortValue(b).localeCompare(txSortValue(a))).slice(0,limit);
    if(!picked.length) return notice('<b>Audit:</b> no rows in this scope.');
    return table(['TxnID','Date','Season','Game/Event','MoneyType','Category','Total','Allocation'],picked.map(t=>[t.TxnID,t.TxnDate,t.Season,t.Game||t.Description,moneyTypeLabel(t),t.Category,money(t.TotalAmount),t.AllocationType]));
  }

  // ---------- screens ----------
  function refreshBlock(){
    if(!connection.connected){
      if(managerRequested()) return notice('<b>Workbook:</b> not connected yet. Click Connect OneDrive to load live transactions.');
      return `<div class="card"><h3>Member data not published yet</h3><div class="sub">Dennis needs to publish the latest member snapshot before this page has current data.</div></div>`;
    }
    if(liveLedger.error) return notice('<b>Workbook read issue:</b> '+(liveLedger.error.message||String(liveLedger.error)),'danger');
    if(liveLedger.loaded) return notice(`<b>Workbook loaded:</b> ${liveLedger.transactions.length} transactions. <button class="btn small" id="refreshBtn">Refresh workbook</button>`);
    return notice('<b>Workbook connected:</b> live transaction rows have not been loaded yet. <button class="btn small" id="refreshBtn">Load workbook</button>');
  }
  function unclassifiedNotice(rows){
    const n=rows.filter(t=>moneyType(t)==='Unclassified').length;
    return n?notice(`<b>${n} row${n===1?'':'s'} need${n===1?'s':''} a Money Type.</b> These rows still count toward totals but aren't sorted into a category yet. Fix them in Manager.`,'danger'):'';
  }
  function historyCard(){
    return `<details class="card"><summary><b>IU Season History</b></summary>${table(['Season','Record','Games','Note'],DATA.history.map(h=>[h.season,h.record,h.games,h.note]))}<p class="eyebrow" style="margin-top:18px">2025 Championship Run</p>${table(['Date','Game','Result','Flag'],DATA.postseason2025.map(g=>[g.date,g.game,g.result,g.flag]))}</details>`;
  }

  function renderHome(){
    if(!ledgerAvailable()){
      layout('Home','Game Day Dashboard','Fund status for the 2026 season ticket group.',`${refreshBlock()}${historyCard()}`);
      bindRefresh();
      return;
    }
    const rows=fundScopeRows();
    const balances=memberBalances();
    const fundPos=fundPositionFromBalances(balances);
    const settled=balances.every(b=>b.amount===0);
    const recent=recentTxns(8);
    const headline=settled
      ? `${card('Fund Status','Settled','everyone is paid up for '+selectedSeasonLabel())}${card('Fund Balance',money(fundPos),'cash available right now')}`
      : `${card('Fund Status','Open Balances','someone owes / is owed money')}${card('Fund Position',money(fundPos),fundPos<0?'scope is underfunded':'cash to distribute or carry forward',fundPos<0?'neg':'')}`;
    layout('Home','Game Day Dashboard','Fund status for the '+selectedSeasonLabel()+' scope: who owes what, and what happened recently.',
      `${seasonSelectorBlock()}${unclassifiedNotice(rows)}<div class="grid two">${headline}</div>`+
      `<p class="eyebrow" style="margin-top:26px">Member Status</p><div class="grid">${balances.map(b=>card(b.name,money(b.amount),b.amount===0?'settled':(b.amount>0?'owed back from the fund':'owes the fund'),b.amount<0?'neg':'')).join('')}</div>`+
      (settled?'':`<p class="eyebrow" style="margin-top:26px">Suggested Settlement</p>${table(['From','To','Amount','Reason'],settlementRows())}`)+
      `<p class="eyebrow" style="margin-top:26px">Recent Activity</p>${activityTable(recent)}`+
      (dennisView()?`<details class="card"><summary><b>Data status</b></summary>${refreshBlock()}${publicSnapshot.loaded?notice('<b>Snapshot:</b> published '+fmtDateTime((publicSnapshot.meta||{}).publishedAt)+' · '+((publicSnapshot.meta||{}).rowCount||liveLedger.transactions.length)+' rows.'):''}</details>`:'')+
      historyCard()
    );
    bindSeasonSelector(); bindRefresh();
  }

  function renderActivity(){
    if(!ledgerAvailable()){
      layout('Activity','Transaction Ledger','A filterable view of every sale, cost, and top-off will appear here once data loads.',refreshBlock());
      bindRefresh();
      return;
    }
    const rows=scopeRows();
    const sm=moneySummary(rows);
    const sharedRows=sharedOpportunityRows();
    const sharedNet=round2(sharedRows.reduce((a,t)=>a+rowTotal(t),0));
    const rollForwardNext=selectedSeasonValue()==='all'?0:rollForwardToNextSeason(selectedSeasonValue());
    const chips=`<div class="grid two">${card('Ticket Sales',money(sm.TicketSale),'sale/resale proceeds')}${card('Parking Sales',money(sm.ParkingSale),'parking sale/resale proceeds')}${card('Ticket Costs',money(sm.TicketCost),'purchases, upgrades, fees',sm.TicketCost<0?'neg':'')}${card('Parking Costs',money(sm.ParkingCost),'parking purchases',sm.ParkingCost<0?'neg':'')}${card('Other Costs',money(sm.OtherCost),'travel/misc',sm.OtherCost<0?'neg':'')}${card('Member Funding',money(sm.MemberFunding),'top-offs, credits, opening balance')}${sharedRows.length?card('Shared Opportunity',money(sharedNet),'one-off buys/resales split evenly, still part of the same fund',sharedNet<0?'neg':''):''}${rollForwardNext>0?card('Rolled Forward',money(rollForwardNext),'carried into next season'):''}</div>`;
    const filtered=filteredTxns();
    let body;
    if(activityGroupBy==='game'){
      const groups=gameGroups(rows);
      body=groups.length?groups.map((g,i)=>{
        const totals=moneySummary(g.rows);
        return `<details class="card game-card" ${i===0?'open':''}><summary><span>${escapeHtml(g.key)}</span><b>${money(totals.total)}</b></summary><div class="sub">${g.rows.length} rows</div>${activityTable(g.rows)}</details>`;
      }).join(''):notice('No game-specific rows in this scope.');
    }else{
      body=activityTable(filtered,300);
    }
    layout('Activity','Transaction Ledger','Every sale, cost, and top-off in one place. Filter, search, or group by game.',
      `${seasonSelectorBlock()}${unclassifiedNotice(rows)}<p class="eyebrow" style="margin-top:26px">Totals for ${selectedSeasonLabel()}</p>${chips}`+
      `<p class="eyebrow" style="margin-top:26px">Filters</p>${activityFiltersBlock()}`+
      `<p class="eyebrow" style="margin-top:26px">${activityGroupBy==='game'?'Games':'Transactions'}</p>${body}`+
      (sharedRows.length?notice('<b>Shared Opportunity</b> rows ('+sharedRows.length+') are included above — filter Money Type to "Shared Opportunity" to see just those.'):'')+
      (dennisView()?`<details class="card"><summary><b>Audit: raw rows</b></summary>${auditTxnTable(rows,30)}</details>`:'')
    );
    bindSeasonSelector(); bindRefresh(); bindFilters();
  }

  // ---------- manager screen ----------
  function selectedPreset(){return presets[$('#txPreset').value]||presets.adjustment;}
  function seasonFromDate(d){return d?Number(String(d).slice(0,4)):2026;}
  function memberAmounts(amount,names){const out={Dennis:0,Joel:0,Kyle:0,Seth:0,Dennis_x2:0,DennisSeat1:0,JoelSeat:0,KyleSeat:0,SethSeat:0,DennisSeat2:0}; names.forEach(n=>out[n]=round2(amount/names.length)); return out;}
  function allocation(owner, allocationType, amount, season=activeSeason()){
    const out={Dennis:0,Joel:0,Kyle:0,Seth:0,Dennis_x2:0,DennisSeat1:0,JoelSeat:0,KyleSeat:0,SethSeat:0,DennisSeat2:0,allocationType};
    if(owner==='All Members') return {...out,...memberAmounts(amount,activeMembersForSeason(season).map(m=>m.key)),allocationType:'Member Split'};
    if(owner==='Dennis Joel Kyle') return {...out,...memberAmounts(amount,['Dennis','Joel','Kyle']),allocationType:'Dennis Joel Kyle Split'};
    if(owner==='All Active Seats'){
      const seats=activeSeatsForSeason(season);
      const per=round2(amount/seats.length);
      const byColumn={}; seats.forEach(s=>byColumn[s.key]=per);
      // rawPersonCredits() reads Dennis + Dennis_x2 together as Dennis's true
      // total. They must sum exactly to his fair share, not just each be
      // "per" - two independently-rounded half-cent shares can drift a cent
      // off (e.g. -18.375 rounding the same way twice gives -36.76, not the
      // correct -36.75). Round Dennis's total once, give the first seat its
      // per-seat share, and let the second seat absorb the remainder.
      const dennisSeatCount=seats.filter(s=>s.owner==='Dennis').length;
      const dennisTotal=round2(amount*dennisSeatCount/seats.length);
      const dennisPrimary=dennisSeatCount>0?per:0;
      const dennisSecond=dennisSeatCount>1?round2(dennisTotal-dennisPrimary):0;
      return {...out,...byColumn,Dennis:dennisPrimary,Dennis_x2:dennisSecond,Joel:seats.some(s=>s.owner==='Joel')?per:0,Kyle:seats.some(s=>s.owner==='Kyle')?per:0,Seth:seats.some(s=>s.owner==='Seth')?per:0,allocationType:'Seat Split'};
    }
    const key=owner==='Dennis x 2'?'Dennis_x2':owner; if(key in out) out[key]=amount;
    if(owner==='Dennis') out.DennisSeat1=amount; if(owner==='Joel') out.JoelSeat=amount; if(owner==='Kyle') out.KyleSeat=amount; if(owner==='Seth') out.SethSeat=amount; if(owner==='Dennis x 2') out.DennisSeat2=amount;
    return out;
  }
  function applyPreset(){
    const p=selectedPreset();
    $('#txMoneyType').value=p.moneyType; $('#txAsset').value=p.assetType; $('#txCategory').value=p.category; $('#txType').value=p.transactionType; $('#txAllocation').value=p.allocationType; $('#txOwner').value=p.owner;
    if(!$('#txDesc').value || $('#txDesc').value==='Manual adjustment') $('#txDesc').value=p.description;
    const amt=$('#txAmount'); const n=Number(amt.value||0);
    if(p.sign==='negative'&&n>0)amt.value=String(-Math.abs(n)); if(p.sign==='positive'&&n<0)amt.value=String(Math.abs(n));
    const hint=$('#presetHint'); if(hint)hint.textContent=p.hint||'';
    if($('#reversalBox'))$('#reversalBox').style.display=($('#txPreset').value==='reversal'?'block':'none');
  }
  function buildTransactionPreview(){
    const date=$('#txDate').value||new Date().toISOString().slice(0,10);
    const moneyTypeVal=$('#txMoneyType').value;
    const assetType=$('#txAsset').value; const amount=round2($('#txAmount').value||0); const owner=$('#txOwner').value;
    const description=($('#txDesc').value||'').trim(); const season=Number($('#txSeason').value||seasonFromDate(date));
    const allocationType=$('#txAllocation').value; const category=$('#txCategory').value; const transactionType=$('#txType').value;
    const gameId=($('#txGameId').value||'').trim(); const game=($('#txGame').value||'').trim(); const notes=($('#txNotes').value||'').trim();
    const a=allocation(owner,allocationType,amount,season);
    return {date,sourceYear:season,sourceRow:'',season,gameId,game,assetType,category,transactionType,description,allocationType:a.allocationType,totalAmount:amount,owner,notes,moneyType:moneyTypeVal,allocation:a};
  }
  function validationErrors(p){
    const errs=[];
    if(!p.date)errs.push('Transaction date is required.');
    if(!p.description)errs.push('Description is required.');
    if(!Number.isFinite(p.totalAmount)||p.totalAmount===0)errs.push('Amount must be a non-zero number.');
    if(!MONEY_TYPES[p.moneyType]||p.moneyType==='Unclassified')errs.push('Choose a Money Type.');
    const group=MONEY_TYPES[p.moneyType]&&MONEY_TYPES[p.moneyType].group;
    if(group==='costs'&&p.totalAmount>0)errs.push('Cost money types should usually be a negative amount.');
    if((group==='sales'||group==='funding')&&p.totalAmount<0)errs.push('Sale/funding money types should usually be a positive amount.');
    if(!connection.connected)errs.push('Connect OneDrive before appending.');
    if(!connection.isManager)errs.push('Only the configured manager can append rows.');
    return errs;
  }
  function buildTransactionRow(txnId,p){
    const a=p.allocation;
    return [txnId,p.sourceYear,p.sourceRow,p.date,p.season,p.gameId,p.game,p.assetType,p.category,p.transactionType,p.description,p.allocationType,p.totalAmount,a.Dennis,a.Joel,a.Kyle,a.Seth,a.Dennis_x2,a.DennisSeat1,a.JoelSeat,a.KyleSeat,a.SethSeat,a.DennisSeat2,'No','',p.notes||'Entered from Hoosier Ticket Command Center web app',p.moneyType];
  }
  function profileStatus(){
    if(!connection.connected)return '<b>Status:</b> Not connected. Click Connect OneDrive before writing.';
    const email=userEmail(connection.profile);
    return `<b>Status:</b> Connected as ${email||'Microsoft account'} · ${connection.isManager?'Manager writeback enabled':'Read-only; not manager account'}`;
  }
  function reversalOptions(){return recentTxns(20).map(t=>`<option value="${t.TxnID}">${t.TxnID} · ${t.TxnDate} · ${t.Description||t.Game||''} · ${money(t.TotalAmount)}</option>`).join('');}
  function txnById(id){return liveLedger.transactions.find(t=>String(t.TxnID)===String(id));}
  function moneyTypeOptions(){return Object.entries(MONEY_TYPES).filter(([k])=>k!=='Unclassified').map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');}
  function renderManagerFull(){
    layout('Manager','Real Transaction Workflow','Pick a Money Type explicitly — the app no longer guesses it from text.',
      `<div class="card"><div class="notice">${profileStatus()}</div><div class="form">`+
      `<label>Preset<select id="txPreset">${Object.entries(presets).map(([k,p])=>`<option value="${k}">${p.label}</option>`).join('')}</select></label>`+
      `<label>Money type<select id="txMoneyType">${moneyTypeOptions()}</select></label>`+
      `<label>Transaction date<input type="date" id="txDate"></label>`+
      `<label>Season<input id="txSeason" type="number" value="2026"></label>`+
      `<label>Game ID<input id="txGameId" placeholder="ex: 2026-01"></label>`+
      `<label class="wide">Game / event<input id="txGame" placeholder="ex: IU vs Purdue"></label>`+
      `<label>Asset type<select id="txAsset"><option>Game Ticket</option><option>Parking</option><option>Fee</option><option>Adjustment</option><option>Travel</option><option>Fund</option></select></label>`+
      `<label>Category<input id="txCategory" value="Manual Entry"></label>`+
      `<label>Transaction type<input id="txType" value="Manual Entry"></label>`+
      `<label>Allocation type<select id="txAllocation"><option>Member Specific</option><option>Seat Owner Only</option><option>Seat Split</option><option>Member Split</option><option>Dennis Joel Kyle Split</option></select></label>`+
      `<label>Owner / split<select id="txOwner"><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Seth</option><option>Dennis x 2</option><option>All Members</option><option>All Active Seats</option><option>Dennis Joel Kyle</option></select></label>`+
      `<label>Amount<input id="txAmount" type="number" step="0.01" placeholder="0.00"></label>`+
      `<label class="wide">Description<textarea id="txDesc" placeholder="Example: IU vs Purdue parking resale"></textarea></label>`+
      `<label class="wide">Notes<textarea id="txNotes" placeholder="Optional notes"></textarea></label>`+
      `</div><div class="notice"><b>Preset guide:</b> <span id="presetHint"></span></div>`+
      `<div class="notice" id="reversalBox" style="display:none"><b>Reversal helper:</b> pick a recent transaction and build an offsetting row (keeps the original for history).<br><select id="reverseTxn"><option value="">Choose transaction</option>${liveLedger.loaded?reversalOptions():''}</select> <button class="btn small" id="buildReversalBtn">Build reversal</button></div>`+
      `<p><button class="btn" id="previewBtn">Preview row</button> <button class="btn" id="appendBtn">Append to OneDrive table</button> <button class="btn" id="refreshManagerBtn">Refresh workbook</button></p>`+
      `<pre class="notice" id="previewBox">No row preview yet.</pre></div>`+
      `<div class="card"><h3>Publish Member Snapshot</h3><p>Use this after adding/changing transactions so Joel and Kyle see the latest read-only dashboard.</p>`+
      `<div class="notice"><b>Publish checklist</b><ol style="margin:8px 0 0 20px;padding:0"><li>Click <b>Refresh workbook</b>.</li><li>Review Home and Activity in manager mode.</li><li>Click <b>Download public-ledger.json</b>.</li><li>In GitHub, replace <b>data/public-ledger.json</b> with the downloaded file.</li><li>Open the member link in incognito and confirm the timestamp updated.</li></ol></div>`+
      `<p><button class="btn" id="publishSnapshotBtn">Download public-ledger.json</button></p>`+
      `<div class="notice"><b>Privacy warning:</b> if your GitHub Pages site is public, this snapshot is public to anyone with the link.</div></div>`+
      `<p class="eyebrow" style="margin-top:26px">All Transactions</p>${activityFiltersBlock()}${activityTable(filteredTxns(),200)}`+
      `<details class="card"><summary><b>Audit: raw rows</b></summary>${auditTxnTable(scopeRows(),40)}</details>`
    );
    setTimeout(bindManager,0); bindRefresh(); setTimeout(bindFilters,0);
  }
  function renderManager(){
    if(!connection.isManager){
      layout('Manager','Manager Tools','Manager writeback and snapshot publishing are reserved for Dennis.',
        `${notice(connection.connected?'<b>Signed in, read-only:</b> this account cannot write manager transactions.':'<b>Not connected:</b> click Connect OneDrive in the header and sign in with the manager account.')}`+
        `<div class="grid two">${card('Writeback','Disabled','only '+(managerEmail()||'the configured manager')+' can append rows')}${card('Snapshot','Read-only','Joel and Kyle can view without OneDrive')}</div>`+
        `<p class="eyebrow" style="margin-top:26px">Recent Activity</p>${activityTable(recentTxns(8))}`);
      return;
    }
    renderManagerFull();
  }
  function buildReversalFromSelected(){
    const id=$('#reverseTxn').value; const t=txnById(id);
    if(!t){alert('Choose a transaction to reverse.'); return;}
    $('#txDate').value=new Date().toISOString().slice(0,10);
    $('#txSeason').value=t.Season||seasonFromDate(t.TxnDate);
    $('#txGameId').value=t.GameID||''; $('#txGame').value=t.Game||'';
    $('#txAsset').value=t.AssetType||'Adjustment'; $('#txCategory').value='Reversal'; $('#txType').value='Reversal';
    $('#txAllocation').value=t.AllocationType||'Member Specific';
    $('#txMoneyType').value=(MONEY_TYPES[t.MoneyType]?t.MoneyType:'OtherCost');
    $('#txAmount').value=String(round2(-Number(t.TotalAmount||0)));
    $('#txDesc').value='Reversal of '+t.TxnID+' - '+(t.Description||t.Game||'transaction');
    $('#txNotes').value='Reversal created from Hoosier Ticket Command Center for '+t.TxnID;
    const members=['Dennis','Joel','Kyle','Seth','Dennis_x2','DennisSeat1','JoelSeat','KyleSeat','SethSeat','DennisSeat2'];
    const largest=members.map(m=>[m,Math.abs(Number(t[m]||0))]).sort((a,b)=>b[1]-a[1])[0];
    const map={Dennis:'Dennis',Joel:'Joel',Kyle:'Kyle',Seth:'Seth',Dennis_x2:'Dennis x 2',DennisSeat1:'Dennis',JoelSeat:'Joel',KyleSeat:'Kyle',SethSeat:'Seth',DennisSeat2:'Dennis x 2'};
    if(largest&&largest[1]>0)$('#txOwner').value=map[largest[0]]||'Dennis';
    previewCurrent();
  }
  function previewCurrent(){
    const p=buildTransactionPreview(); const errs=validationErrors(p);
    $('#previewBox').textContent=JSON.stringify({readyToAppend:errs.length===0,validation:errs,preview:p,rowShape:buildTransactionRow('TXN-NEXT',p)},null,2);
  }
  function bindManager(){
    const today=new Date().toISOString().slice(0,10); $('#txDate').value=today;
    $('#txPreset').onchange=applyPreset; applyPreset();
    $('#previewBtn').onclick=previewCurrent;
    if($('#buildReversalBtn'))$('#buildReversalBtn').onclick=buildReversalFromSelected;
    $('#refreshManagerBtn').onclick=async()=>{await refreshLedger(); show('manager');};
    const ps=$('#publishSnapshotBtn'); if(ps)ps.onclick=downloadPublicSnapshot;
    $('#appendBtn').onclick=async()=>{
      try{
        if(!window.HTCC_GRAPH||!window.HTCC_GRAPH.appendTransaction)throw new Error('Graph writeback client not loaded.');
        const p=buildTransactionPreview(); const errs=validationErrors(p);
        if(errs.length)throw new Error(errs.join(' '));
        if(!confirm('Append '+money(p.totalAmount)+' as '+MONEY_TYPES[p.moneyType].label+'?')) return;
        $('#previewBox').textContent='Appending row to OneDrive...';
        const txnId=await window.HTCC_GRAPH.nextTransactionId();
        const row=buildTransactionRow(txnId,p);
        const result=await window.HTCC_GRAPH.appendTransaction(row);
        liveLedger.lastWrite={txnId,row,result,at:new Date()};
        await refreshLedger();
        $('#previewBox').textContent=JSON.stringify({status:'Appended and refreshed from OneDrive TransactionsTable',txnId,row,liveRows:liveLedger.transactions.length},null,2);
        alert('Appended '+txnId+' and refreshed workbook data.');
        show('manager');
      }catch(e){
        console.error('Append failed',e);
        $('#previewBox').textContent='Append failed: '+(e.message||String(e));
        alert('Append failed: '+(e.message||String(e)));
      }
    };
  }
  function buildPublicSnapshot(){
    const rows=liveLedger.transactions.map(t=>{const obj={}; TXN_COLUMNS.forEach(c=>obj[c]=(t[c]===undefined?'':t[c])); return obj;});
    const last=recentTxns(1)[0];
    return {meta:{format:'HTCC_PUBLIC_LEDGER_SNAPSHOT_V3',publishedAt:new Date().toISOString(),rowCount:rows.length,latestTxn:last?last.TxnID:'—',latestDate:last?last.TxnDate:'—',notice:'Read-only member dashboard snapshot. Public if hosted on public GitHub Pages.'},columns:TXN_COLUMNS,transactions:rows};
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
      a.href=url; a.download='public-ledger.json'; a.rel='noopener'; a.style.display='none';
      document.body.appendChild(a);
      a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      setTimeout(()=>{try{URL.revokeObjectURL(url);}catch(_){ } try{a.remove();}catch(_){ }},4000);
      showSnapshotFallback(json,url);
    }catch(e){
      console.error('Snapshot download failed',e);
      alert('Snapshot download failed: '+(e.message||String(e)));
    }
  }
  function showSnapshotFallback(json,url){
    const btn=$('#publishSnapshotBtn');
    if(!btn) return;
    let box=$('#snapshotDownloadFallback');
    if(!box){
      box=document.createElement('div'); box.id='snapshotDownloadFallback'; box.className='notice';
      btn.closest('.card')?.appendChild(box);
    }
    box.innerHTML=`<b>Snapshot ready:</b> if your browser didn't download automatically, use the backup link or copy the JSON into <b>data/public-ledger.json</b> in GitHub.<p><a class="btn small" download="public-ledger.json" href="${url}">Download backup link</a> <button class="btn small" id="copySnapshotJsonBtn">Copy JSON</button></p><textarea id="snapshotJsonText" style="width:100%;min-height:180px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px">${escapeHtml(json)}</textarea>`;
    const copy=$('#copySnapshotJsonBtn');
    if(copy) copy.onclick=async()=>{try{await navigator.clipboard.writeText(json); alert('Snapshot JSON copied.');}catch(e){const t=$('#snapshotJsonText'); if(t){t.focus(); t.select();} alert('Copy blocked by browser. The JSON box is selected so you can copy it manually.');}};
  }

  // ---------- router ----------
  const renderers={home:renderHome,activity:renderActivity,manager:renderManager};
  function show(id){
    try{
      if(id==='manager'&&!dennisView()) id='home';
      const changingPage=id!==current;
      if(changingPage){selectedSeason='active'; activityGroupBy='none';}
      current=id; renderNav();
      document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
      (renderers[id]||renderHome)();
      if(changingPage) window.scrollTo({top:0,left:0,behavior:'auto'});
    }catch(err){
      console.error('HTCC render failure',id,err);
      $('#app').innerHTML=`<section><p class="eyebrow">App error</p><h2>Something failed to render</h2>${notice('<b>Error:</b> '+(err&&err.message?err.message:String(err)),'danger')}</section>`;
    }
  }
  async function connectOneDrive(){
    if(connection.connected){ await refreshLedger(); setMode(); show(current); return; }
    if(!window.HTCC_GRAPH)throw new Error('Graph client not loaded');
    const res=await window.HTCC_GRAPH.connect();
    connection.connected=true; connection.profile=res.profile||null;
    const email=userEmail(connection.profile); connection.isManager=!!email&&email===managerEmail();
    await refreshLedger(); setMode(); show(current);
    alert('Connected as '+(email||'Microsoft account')+(connection.isManager?' · Manager writeback enabled':' · Read-only account')+'. Workbook rows loaded: '+(liveLedger.transactions.length||0));
  }
  function init(){
    try{
      setMode(); renderNav();
      const n=$('#bottomNav'); n.onclick=e=>{const b=e.target.closest('button[data-screen]'); if(b)show(b.dataset.screen);};
      const cb=$('#connectBtn'); if(cb)cb.onclick=async()=>{try{await connectOneDrive();}catch(e){alert(e.message||String(e));}};
      show('home');
      loadPublicSnapshot().then(()=>{setMode(); if(publicSnapshot.loaded)show(current);});
    }catch(e){
      console.error(e);
      $('#app').innerHTML=`<div class="notice danger"><b>Startup failed:</b> ${e.message||String(e)}</div>`;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
