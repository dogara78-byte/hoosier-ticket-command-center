(function(){
  const VERSION = 'v2026.06.25-patch12-current-season-fix';
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

  const screens=[['score','🏟️','Score'],['money','💰','Money'],['seats','🎟️','Seats'],['parking','🅿️','Parking'],['history','🏆','History'],['settle','🤝','Settle'],['manager','✍️','Manager']];
  let current='score';
  let connection={connected:false,isManager:false,profile:null};
  let liveLedger={loaded:false,loading:false,error:null,lastLoaded:null,transactions:[],lastWrite:null};
  let publicSnapshot={loaded:false,error:null,meta:null};

  const $=s=>document.querySelector(s);
  const money=n=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const money0=n=>'$'+Math.round(Number(n||0)).toLocaleString('en-US');
  const round2=v=>Math.round(Number(v||0)*100)/100;
  const cfg=()=>window.HTCC_CONFIG||{};
  const graphConfigured=()=>cfg().authMode==='graph'||cfg().graphEnabled===true;
  const ready=()=>window.HTCC_GRAPH&&window.HTCC_GRAPH.msalReady&&window.HTCC_GRAPH.msalReady();
  const userEmail=profile=>String((profile&&(profile.mail||profile.userPrincipalName))||'').toLowerCase();
  const managerEmail=()=>String(cfg().managerEmail||'').toLowerCase();

  function setMode(){
    let text='Fallback JSON';
    if(graphConfigured()) text=ready()?(connection.connected?'OneDrive connected':'Graph configured'):'Graph configured - MSAL blocked';
    if(publicSnapshot.loaded && !connection.connected) text='Public member snapshot loaded';
    if(connection.connected && liveLedger.loaded) text='OneDrive connected · workbook loaded';
    if(liveLedger.error) text='OneDrive connected · workbook read issue';
    $('#dataMode').textContent=text;
    $('#version').textContent=VERSION;
  }
  function card(title,val,sub,cls=''){return `<article class="card"><h3>${title}</h3><div class="value ${cls}">${val}</div><div class="sub">${sub||''}</div></article>`;}
  function notice(html,cls=''){return `<div class="notice ${cls}">${html}</div>`;}
  function table(headers,rows){return `<div class="table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i>0?'num':''}">${c==null?'':c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  function layout(eyebrow,title,lede,body){$('#app').innerHTML=`${notice('<b>Privacy flag:</b> this app displays real financial data. Public member snapshot data is viewable by anyone with the GitHub Pages link.')}<section><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="lede">${lede}</p>${body}</section>`;}

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
    return {count:tx.length, lastTxn:last?last.TxnID:'—', lastDate:last?last.TxnDate:'—', addedFromApp};
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
    if(!connection.connected) return notice('<b>Workbook:</b> not connected yet. Click Connect OneDrive to load live transactions.');
    if(liveLedger.error) return notice('<b>Workbook read issue:</b> '+(liveLedger.error.message||String(liveLedger.error)),'danger');
    if(liveLedger.loaded){const s=liveStats(); return notice(`<b>Workbook loaded:</b> ${s.count} transactions · latest ${s.lastTxn} (${s.lastDate}) · ${s.addedFromApp} added from the app. <button class="btn small" id="refreshBtn">Refresh workbook</button>`);}
    return notice('<b>Workbook connected:</b> live transaction rows have not been loaded yet. <button class="btn small" id="refreshBtn">Load workbook</button>');
  }
  function bindRefresh(){const b=$('#refreshBtn'); if(b)b.onclick=async()=>{await refreshLedger(); show(current);};}
  function recentTransactionsBlock(limit=10){
    if(!liveLedger.loaded) return refreshBlock();
    const rows=recentTxns(limit).map(t=>[t.TxnID,t.TxnDate,t.Game||t.Description,t.AssetType,t.Category,money(t.TotalAmount),t.AllocationType]);
    return `<p class="eyebrow" style="margin-top:26px">Live workbook ledger</p>${refreshBlock()}${table(['TxnID','Date','Game/Event','Asset','Category','Total','Allocation'],rows)}`;
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
  function scopeNote(label){
    return `<b>${label}:</b> live totals are scoped to the active season (${activeSeason()}) so old 2024/2025 history does not distort current balances.`;
  }
  function personAmount(rows,name){
    // Dennis_x2 is Dennis's second-seat accounting column, not a separate person.
    return name==='Dennis'?round2(sumField(rows,'Dennis')+sumField(rows,'Dennis_x2')):sumField(rows,name);
  }
  function personHitCount(rows,name){
    return rows.filter(t=>Number(t[name]||0)!==0 || (name==='Dennis'&&Number(t.Dennis_x2||0)!==0)).length;
  }
  function memberBalances(){
    const rows=seasonRows();
    return memberNames.map(name=>({key:name,name:memberLabels[name],amount:personAmount(rows,name),recent:personHitCount(rows,name)}));
  }
  function seatBalances(){
    const rows=seasonRows();
    return seatNames.map(name=>({key:name,name:seatLabels[name],owner:seatOwner[name],amount:sumField(rows,name),recent:rows.filter(t=>Number(t[name]||0)!==0).length}));
  }
  function parkingTotals(){
    const rows=seasonRows().filter(t=>String(t.AssetType||'').toLowerCase().includes('parking'));
    return ['Dennis','Joel','Kyle','Seth'].map(name=>({name,amount:sumField(rows,name),count:rows.filter(t=>Number(t[name]||0)!==0).length}));
  }
  function memberRecentRows(member,limit=6){
    return recentTxns(100).filter(t=>Number(t[member]||0)!==0 || (member==='Dennis'&&Number(t.DennisSeat1||0)!==0) || (member==='Joel'&&Number(t.JoelSeat||0)!==0) || (member==='Kyle'&&Number(t.KyleSeat||0)!==0) || (member==='Seth'&&Number(t.SethSeat||0)!==0)).slice(0,limit);
  }
  function settlementRows(){
    const balances=memberBalances();
    const positives=balances.filter(b=>b.amount>0.005).map(b=>({...b,remaining:b.amount}));
    const negatives=balances.filter(b=>b.amount<-0.005).map(b=>({...b,remaining:-b.amount}));
    const rows=[];
    let i=0,j=0;
    while(i<negatives.length && j<positives.length){
      const amt=round2(Math.min(negatives[i].remaining,positives[j].remaining));
      if(amt>0) rows.push([negatives[i].name,positives[j].name,money(amt),'Balances offset through shared fund']);
      negatives[i].remaining=round2(negatives[i].remaining-amt);
      positives[j].remaining=round2(positives[j].remaining-amt);
      if(negatives[i].remaining<=0.005)i++; if(positives[j].remaining<=0.005)j++;
    }
    return rows;
  }

  function renderScore(){const m=DATA.metrics, f=DATA.activeFunds, s=liveStats(); layout('Scoreboard','Game Day Dashboard','Current values are active 2026 fund balances. Workbook status and recent activity now refresh after manager writeback.',`<div class="grid">${card('Current Account Balance',money(m.currentAccountBalance),'2026 active ledger')}${card('Workbook Rows',liveLedger.loaded?String(s.count):'—','live TransactionsTable rows')}${card('Latest Transaction',liveLedger.loaded?s.lastTxn:'—',liveLedger.loaded?s.lastDate:'connect OneDrive to load')}${card('Lifetime Sales Handled',money0(m.lifetimeSales),'2024 + 2025 regular sales')}</div>${refreshBlock()}<p class="eyebrow" style="margin-top:26px">Active Funds</p><div class="grid">${f.map(x=>`<article class="card"><h3>${x.name}</h3><div class="value">${money(x.balance)}</div><div class="line"><span>Roll-forward</span><b>${money(x.rollForward)}</b></div><div class="line"><span>2026 cash paid</span><b>${money(x.cashPaid)}</b></div></article>`).join('')}</div>${recentTransactionsBlock(5)}`); bindRefresh();}
  function renderMoney(){const m=DATA.metrics; layout('Money','Hoosier Fund Moneyline','Money is split into current active balance, historical sales handled, ticket activity, and parking activity. Recent rows below come directly from the workbook after OneDrive is connected.',`<div class="grid two">${card('Current Active Balance',money(m.currentAccountBalance),'cash currently held for 2026 active ledger')}${card('2026 Sales Logged',money(m.sales2026),'new 2026 activity')}${card('Lifetime Regular Sales',money(m.lifetimeSales),'2024 + 2025 handled through the ledger')}${card('Ticket Activity',money(m.ticketActivity),'tickets only, parking removed')}${card('Parking Activity',money(m.lifetimeParking),'member-level parking split')}${card('Settlement If Closed Today',money(m.currentAccountBalance),'based on active ledger assumption')}</div>${notice('<b>Rule:</b> current balance and lifetime activity are intentionally separate. Old sales are history unless they rolled forward into current funds.')}${recentTransactionsBlock(12)}`); bindRefresh();}
  function renderSeats(){
    const live=ledgerAvailable();
    const seatRows=live?seatBalances():DATA.seatAccounts.map(s=>({name:s.seat,owner:s.owner,amount:s.balance,recent:0}));
    const cards=seatRows.map(s=>card(s.name,money(s.amount),`Owner: ${s.owner} · ${s.recent||0} ledger rows`,s.amount<0?'neg':'' )).join('');
    layout('Seats','Seat Ownership View','Ticket accounting is shown at the seat level. Parking remains member-level and is intentionally excluded from the seat view.',`<div class="grid">${cards}</div>${live?notice(scopeNote('Live seat view')+' Dennis Seat 2 is active for 2026.'):notice('<b>Fallback seat view:</b> connect OneDrive for live seat totals.')}<p class="eyebrow" style="margin-top:26px">Seat Ledger Summary</p>${table(['Seat','Owner','Live Total','Rows Hit'],seatRows.map(s=>[s.name,s.owner,money(s.amount),s.recent||0]))}<p class="eyebrow" style="margin-top:26px">Seat Account Rules</p>${table(['Seat','Owner','Active From','Active To'],DATA.seatAccounts.map(s=>[s.seat,s.owner,s.activeFrom,s.activeTo]))}${live?recentTransactionsBlock(8):''}`);
    bindRefresh();
  }
  function renderParking(){
    const live=ledgerAvailable();
    const pRows=live?parkingTotals():DATA.parking.map(p=>({name:p.year,amount:p.amount,count:0}));
    const total=live?round2(pRows.reduce((a,p)=>a+p.amount,0)):DATA.parking.reduce((a,p)=>a+p.amount,0);
    layout('Parking','Parking Pass Tracker','Parking is tracked at the member level, not the seat level. This page separates parking activity from game-ticket seat accounting.',`<div class="grid">${pRows.map(p=>card(p.name,money(p.amount),live?`${p.count} parking ledger rows`:(p.amount?'member-level split':'nothing yet'),p.amount<0?'neg':'')).join('')}${card('Parking Total',money(total),live?'live parking rows only':'historical fallback total',total<0?'neg':'')}</div>${notice((live?scopeNote('Live parking view')+' ':'')+'<b>Parking rule:</b> parking charges and sales hit member columns only. They should not hit DennisSeat1, JoelSeat, KyleSeat, SethSeat, or DennisSeat2.')} ${live?table(['Member','Parking Total','Rows Hit'],pRows.map(p=>[p.name,money(p.amount),p.count]))+recentTransactionsBlock(8):refreshBlock()}`);
    bindRefresh();
  }
  function renderHistory(){layout('Hoosier History','Season Rewind','History gives the dashboard some soul, but it stays separate from the accounting ledger.',`${table(['Season','Record','Games','Note'],DATA.history.map(h=>[h.season,h.record,h.games,h.note]))}<p class="eyebrow" style="margin-top:26px">2025 Championship Run</p>${table(['Date','Game','Result','Flag'],DATA.postseason2025.map(g=>[g.date,g.game,g.result,g.flag]))}`);}
  function renderSettle(){
    const live=ledgerAvailable();
    const balances=live?memberBalances():DATA.activeFunds.map(f=>({name:f.name,amount:f.balance,recent:0}));
    const rows=settlementRows();
    const total=round2(balances.reduce((a,b)=>a+b.amount,0));
    layout('Settlement','Member Settlement Report','This view converts the live ledger into member balance cards and a practical who-owes-who settlement plan.',`<div class="grid">${balances.map(b=>card(b.name,money(b.amount),`${b.recent||0} ledger rows`,b.amount<0?'neg':'')).join('')}${card('Net Check',money(total),'should be close to zero after closed-loop settlement',Math.abs(total)>0.005?'neg':'')}</div>${live?notice(scopeNote('Live settlement')+' Positive means the member is ahead / should receive value from the fund; negative means the member is behind / should contribute value. Dennis_x2 is rolled into Dennis, not shown as a separate person.'):refreshBlock()}<p class="eyebrow" style="margin-top:26px">Suggested Settlement</p>${rows.length?table(['From','To','Amount','Reason'],rows):notice('<b>No settlement transfers needed:</b> live member balances are already even, or there are no opposite balances to net.')}<p class="eyebrow" style="margin-top:26px">Member Balance Detail</p>${table(['Member','Balance','Ledger Rows'],balances.map(b=>[b.name,money(b.amount),b.recent||0]))}${live?transactionFiltersBlock(20):''}`);
    bindRefresh(); bindFilters();
  }

  function selectedPreset(){return presets[$('#txPreset').value]||presets.adjustment;}
  function seasonFromDate(d){return d?Number(String(d).slice(0,4)):2026;}
  function memberAmounts(amount,names){const out={Dennis:0,Joel:0,Kyle:0,Seth:0,Dennis_x2:0,DennisSeat1:0,JoelSeat:0,KyleSeat:0,SethSeat:0,DennisSeat2:0}; names.forEach(n=>out[n]=round2(amount/names.length)); return out;}
  function allocation(owner, allocationType, assetType, amount){
    const out={Dennis:0,Joel:0,Kyle:0,Seth:0,Dennis_x2:0,DennisSeat1:0,JoelSeat:0,KyleSeat:0,SethSeat:0,DennisSeat2:0,allocationType};
    if(owner==='All Members') return {...out,...memberAmounts(amount,['Dennis','Joel','Kyle','Seth']),allocationType:'Member Split'};
    if(owner==='Dennis Joel Kyle') return {...out,...memberAmounts(amount,['Dennis','Joel','Kyle']),allocationType:'Dennis Joel Kyle Split'};
    if(owner==='All Active Seats') return {...out,...memberAmounts(amount,['DennisSeat1','JoelSeat','KyleSeat','DennisSeat2']),Dennis:round2(amount/4),Joel:round2(amount/4),Kyle:round2(amount/4),Dennis_x2:round2(amount/4),allocationType:'Seat Split'};
    const key=owner==='Dennis x 2'?'Dennis_x2':owner; if(key in out) out[key]=amount;
    if(owner==='Dennis') out.DennisSeat1=amount; if(owner==='Joel') out.JoelSeat=amount; if(owner==='Kyle') out.KyleSeat=amount; if(owner==='Seth') out.SethSeat=amount; if(owner==='Dennis x 2') out.DennisSeat2=amount;
    return out;
  }
  function applyPreset(){const p=selectedPreset(); $('#txAsset').value=p.assetType; $('#txCategory').value=p.category; $('#txType').value=p.transactionType; $('#txAllocation').value=p.allocationType; $('#txOwner').value=p.owner; if(!$('#txDesc').value || $('#txDesc').value==='Manual adjustment') $('#txDesc').value=p.description; const amt=$('#txAmount'); const n=Number(amt.value||0); if(p.sign==='negative'&&n>0)amt.value=String(-Math.abs(n)); if(p.sign==='positive'&&n<0)amt.value=String(Math.abs(n)); const hint=$('#presetHint'); if(hint)hint.textContent=p.hint||''; if($('#reversalBox'))$('#reversalBox').style.display=($('#txPreset').value==='reversal'?'block':'none');}
  function buildTransactionPreview(){
    const date=$('#txDate').value||new Date().toISOString().slice(0,10); const assetType=$('#txAsset').value; const amount=round2($('#txAmount').value||0); const owner=$('#txOwner').value; const description=($('#txDesc').value||'').trim(); const season=Number($('#txSeason').value||seasonFromDate(date)); const allocationType=$('#txAllocation').value; const category=$('#txCategory').value; const transactionType=$('#txType').value; const gameId=($('#txGameId').value||'').trim(); const game=($('#txGame').value||'').trim(); const notes=($('#txNotes').value||'').trim();
    const a=allocation(owner,allocationType,assetType,amount); return {date,sourceYear:season,sourceRow:'',season,gameId,game,assetType,category,transactionType,description,allocationType:a.allocationType,totalAmount:amount,owner,notes,allocation:a};
  }
  function validationErrors(p){const errs=[]; const preset=selectedPreset(); if(!p.date)errs.push('Transaction date is required.'); if(!p.description)errs.push('Description is required.'); if(!Number.isFinite(p.totalAmount)||p.totalAmount===0)errs.push('Amount must be a non-zero number.'); if(p.assetType==='Parking'&&!['Member Split','Dennis Joel Kyle Split','Member Specific'].includes(p.allocationType))errs.push('Parking should be allocated at member level, not seat level.'); if(['Ticket Purchase','Parking Purchase','Future Season Ticket','Postseason Purchase','Reimbursement'].includes(p.category)&&p.totalAmount>0)errs.push('This preset usually writes as a negative amount.'); if(['Sale','Postseason Resale','Manual Top-off'].includes(p.category)&&p.totalAmount<0)errs.push('This preset usually writes as a positive amount.'); if(p.assetType==='Game Ticket'&&p.allocationType==='Member Split')errs.push('Game tickets should usually be seat split or seat-owner only.'); if(p.category==='Test'&&!/test/i.test(p.description))errs.push('Test preset description should include TEST so it is easy to clean up.'); if(preset.label.startsWith('Reversal')&&!/reversal/i.test(p.description))errs.push('Reversal description should identify the original transaction.'); if(!connection.connected)errs.push('Connect OneDrive before appending.'); if(!connection.isManager)errs.push('Only the configured manager can append rows.'); return errs;}
  function buildTransactionRow(txnId,p){const a=p.allocation; return [txnId,p.sourceYear,p.sourceRow,p.date,p.season,p.gameId,p.game,p.assetType,p.category,p.transactionType,p.description,p.allocationType,p.totalAmount,a.Dennis,a.Joel,a.Kyle,a.Seth,a.Dennis_x2,a.DennisSeat1,a.JoelSeat,a.KyleSeat,a.SethSeat,a.DennisSeat2,'No','',p.notes||'Entered from Hoosier Ticket Command Center web app'];}
  function profileStatus(){if(!connection.connected)return '<b>Status:</b> Not connected. Click Connect OneDrive before writing.'; const email=userEmail(connection.profile); return `<b>Status:</b> Connected as ${email||'Microsoft account'} · ${connection.isManager?'Manager writeback enabled':'Read-only; not manager account'}`;}
  function renderManager(){layout('Manager','Real Transaction Workflow','Use presets to build clean rows, preview the allocation, or create a reversal instead of deleting history.',`<div class="card"><div class="notice">${profileStatus()}</div><div class="form"><label>Preset<select id="txPreset">${Object.entries(presets).map(([k,p])=>`<option value="${k}">${p.label}</option>`).join('')}</select></label><label>Transaction date<input type="date" id="txDate"></label><label>Season<input id="txSeason" type="number" value="2026"></label><label>Game ID<input id="txGameId" placeholder="ex: 2026-01"></label><label class="wide">Game / event<input id="txGame" placeholder="ex: IU vs Purdue"></label><label>Asset type<select id="txAsset"><option>Game Ticket</option><option>Parking</option><option>Fee</option><option>Adjustment</option><option>Travel</option><option>Fund</option></select></label><label>Category<input id="txCategory" value="Manual Entry"></label><label>Transaction type<input id="txType" value="Manual Entry"></label><label>Allocation type<select id="txAllocation"><option>Member Specific</option><option>Seat Owner Only</option><option>Seat Split</option><option>Member Split</option><option>Dennis Joel Kyle Split</option></select></label><label>Owner / split<select id="txOwner"><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Seth</option><option>Dennis x 2</option><option>All Members</option><option>All Active Seats</option><option>Dennis Joel Kyle</option></select></label><label>Amount<input id="txAmount" type="number" step="0.01" placeholder="0.00"></label><label class="wide">Description<textarea id="txDesc" placeholder="Example: IU vs Purdue parking resale"></textarea></label><label class="wide">Notes<textarea id="txNotes" placeholder="Optional notes"></textarea></label></div><div class="notice"><b>Preset guide:</b> <span id="presetHint"></span></div><div class="notice" id="reversalBox" style="display:none"><b>Reversal helper:</b> select a recent transaction and click Build Reversal. This creates an offsetting row while preserving the original.<br><select id="reverseTxn"><option value="">Choose transaction</option>${liveLedger.loaded?reversalOptions():''}</select> <button class="btn small" id="buildReversalBtn">Build reversal</button></div><p><button class="btn" id="previewBtn">Preview row</button> <button class="btn" id="appendBtn">Append to OneDrive table</button> <button class="btn" id="refreshManagerBtn">Refresh workbook</button></p><pre class="notice" id="previewBox">No row preview yet.</pre><div id="allocationPreview"></div><div class="notice"><b>Tip:</b> Sales/resales should usually be positive. Purchases, reimbursements, fees, and season payments should usually be negative. Use reversals for mistakes instead of deleting rows.</div></div><div class="card"><h3>Publish Member Snapshot</h3><p>Download a read-only <b>public-ledger.json</b> file after the workbook is refreshed. Upload it to the repo path <b>data/public-ledger.json</b> so Joel and Kyle can view current transactions without OneDrive sign-in.</p><p><button class="btn" id="publishSnapshotBtn">Download public-ledger.json</button></p><div class="notice"><b>Privacy warning:</b> if your GitHub Pages site is public, this snapshot is public to anyone with the link.</div></div>${transactionFiltersBlock(20)}`); setTimeout(bindManager,0); bindRefresh(); setTimeout(bindFilters,0);}
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
    return {meta:{format:'HTCC_PUBLIC_LEDGER_SNAPSHOT_V1',publishedAt:new Date().toISOString(),rowCount:rows.length,latestTxn:s.lastTxn,latestDate:s.lastDate,notice:'Read-only member dashboard snapshot. Public if hosted on public GitHub Pages.'},columns:TXN_COLUMNS,transactions:rows};
  }
  function downloadPublicSnapshot(){
    if(!liveLedger.loaded || !liveLedger.transactions.length){alert('Load the workbook before publishing a member snapshot.'); return;}
    if(!connection.isManager){alert('Only the manager account can publish the member snapshot.'); return;}
    const snapshot=buildPublicSnapshot();
    const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='public-ledger.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }


  const renderers={score:renderScore,money:renderMoney,seats:renderSeats,parking:renderParking,history:renderHistory,settle:renderSettle,manager:renderManager};
  function show(id){try{current=id; document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.screen===id)); (renderers[id]||renderScore)();}catch(err){console.error('HTCC render failure',id,err); $('#app').innerHTML=`<section><p class="eyebrow">App error</p><h2>Something failed to render</h2>${notice('<b>Error:</b> '+(err&&err.message?err.message:String(err)),'danger')}</section>`;}}
  async function connectOneDrive(){if(!window.HTCC_GRAPH)throw new Error('Graph client not loaded'); const res=await window.HTCC_GRAPH.connect(); connection.connected=true; connection.profile=res.profile||null; const email=userEmail(connection.profile); connection.isManager=!!email&&email===managerEmail(); await refreshLedger(); setMode(); show(current); alert('Connected as '+(email||'Microsoft account')+(connection.isManager?' · Manager writeback enabled':' · Read-only account')+'. Workbook rows loaded: '+(liveLedger.transactions.length||0));}
  function init(){try{setMode(); const n=$('#bottomNav'); n.innerHTML=screens.map(([id,icon,label])=>`<button class="navbtn" data-screen="${id}"><span>${icon}</span>${label}</button>`).join(''); n.onclick=e=>{const b=e.target.closest('button[data-screen]'); if(b)show(b.dataset.screen);}; const cb=$('#connectBtn'); if(cb)cb.onclick=async()=>{try{await connectOneDrive();}catch(e){alert(e.message||String(e));}}; show('score'); loadPublicSnapshot().then(()=>{if(publicSnapshot.loaded)show(current);});}catch(e){console.error(e); $('#app').innerHTML=`<div class="notice danger"><b>Startup failed:</b> ${e.message||String(e)}</div>`;}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
