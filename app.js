(function(){
  const VERSION = 'v2026.06.25-patch8-live-refresh';
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
    ticketSale:{label:'Ticket sale',assetType:'Game Ticket',category:'Sale',transactionType:'Ticket Sale',allocationType:'Seat Owner Only',owner:'Dennis',sign:'positive',description:'Ticket sale'},
    parkingSale:{label:'Parking sale',assetType:'Parking',category:'Sale',transactionType:'Parking Sale',allocationType:'Member Split',owner:'All Members',sign:'positive',description:'Parking sale'},
    ticketPurchase:{label:'Game ticket purchase',assetType:'Game Ticket',category:'Ticket Purchase',transactionType:'Ticket Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Game ticket purchase'},
    parkingPurchase:{label:'Parking purchase',assetType:'Parking',category:'Parking Purchase',transactionType:'Parking Purchase',allocationType:'Member Split',owner:'All Members',sign:'negative',description:'Parking purchase'},
    seasonPayment:{label:'Season-ticket payment',assetType:'Game Ticket',category:'Future Season Ticket',transactionType:'Season Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Season-ticket payment'},
    postseasonPurchase:{label:'Postseason purchase',assetType:'Game Ticket',category:'Postseason Purchase',transactionType:'Postseason Purchase',allocationType:'Seat Split',owner:'All Active Seats',sign:'negative',description:'Postseason ticket purchase'},
    postseasonResale:{label:'Postseason resale',assetType:'Game Ticket',category:'Postseason Resale',transactionType:'Postseason Resale',allocationType:'Seat Split',owner:'All Active Seats',sign:'positive',description:'Postseason resale'},
    manualTopoff:{label:'Manual top-off / donation',assetType:'Adjustment',category:'Manual Top-off',transactionType:'Fund Donation',allocationType:'Dennis Joel Kyle Split',owner:'Dennis Joel Kyle',sign:'positive',description:'Manual top-off'},
    reimbursement:{label:'Reimbursement',assetType:'Adjustment',category:'Reimbursement',transactionType:'Reimbursement',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'Reimbursement'},
    adjustment:{label:'Adjustment',assetType:'Adjustment',category:'Adjustment',transactionType:'Manual Adjustment',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'Manual adjustment'},
    test:{label:'TEST writeback validation',assetType:'Game Ticket',category:'Test',transactionType:'Graph Writeback Test',allocationType:'Member Specific',owner:'Dennis',sign:'positive',description:'TEST - Graph writeback validation'}
  };

  const screens=[['score','🏟️','Score'],['money','💰','Money'],['seats','🎟️','Seats'],['parking','🅿️','Parking'],['history','🏆','History'],['settle','🤝','Settle'],['manager','✍️','Manager']];
  let current='score';
  let connection={connected:false,isManager:false,profile:null};
  let liveLedger={loaded:false,loading:false,error:null,lastLoaded:null,transactions:[],lastWrite:null};

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
    if(connection.connected && liveLedger.loaded) text='OneDrive connected · workbook loaded';
    if(liveLedger.error) text='OneDrive connected · workbook read issue';
    $('#dataMode').textContent=text;
    $('#version').textContent=VERSION;
  }
  function card(title,val,sub,cls=''){return `<article class="card"><h3>${title}</h3><div class="value ${cls}">${val}</div><div class="sub">${sub||''}</div></article>`;}
  function notice(html,cls=''){return `<div class="notice ${cls}">${html}</div>`;}
  function table(headers,rows){return `<div class="table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i>0?'num':''}">${c==null?'':c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
  function layout(eyebrow,title,lede,body){$('#app').innerHTML=`${notice('<b>Privacy flag:</b> this app displays real financial data. Host the app safely and keep the workbook/JSON private.')}<section><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="lede">${lede}</p>${body}</section>`;}

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

  function renderScore(){const m=DATA.metrics, f=DATA.activeFunds, s=liveStats(); layout('Scoreboard','Game Day Dashboard','Current values are active 2026 fund balances. Workbook status and recent activity now refresh after manager writeback.',`<div class="grid">${card('Current Account Balance',money(m.currentAccountBalance),'2026 active ledger')}${card('Workbook Rows',liveLedger.loaded?String(s.count):'—','live TransactionsTable rows')}${card('Latest Transaction',liveLedger.loaded?s.lastTxn:'—',liveLedger.loaded?s.lastDate:'connect OneDrive to load')}${card('Lifetime Sales Handled',money0(m.lifetimeSales),'2024 + 2025 regular sales')}</div>${refreshBlock()}<p class="eyebrow" style="margin-top:26px">Active Funds</p><div class="grid">${f.map(x=>`<article class="card"><h3>${x.name}</h3><div class="value">${money(x.balance)}</div><div class="line"><span>Roll-forward</span><b>${money(x.rollForward)}</b></div><div class="line"><span>2026 cash paid</span><b>${money(x.cashPaid)}</b></div></article>`).join('')}</div>${recentTransactionsBlock(5)}`); bindRefresh();}
  function renderMoney(){const m=DATA.metrics; layout('Money','Hoosier Fund Moneyline','Money is split into current active balance, historical sales handled, ticket activity, and parking activity. Recent rows below come directly from the workbook after OneDrive is connected.',`<div class="grid two">${card('Current Active Balance',money(m.currentAccountBalance),'cash currently held for 2026 active ledger')}${card('2026 Sales Logged',money(m.sales2026),'new 2026 activity')}${card('Lifetime Regular Sales',money(m.lifetimeSales),'2024 + 2025 handled through the ledger')}${card('Ticket Activity',money(m.ticketActivity),'tickets only, parking removed')}${card('Parking Activity',money(m.lifetimeParking),'member-level parking split')}${card('Settlement If Closed Today',money(m.currentAccountBalance),'based on active ledger assumption')}</div>${notice('<b>Rule:</b> current balance and lifetime activity are intentionally separate. Old sales are history unless they rolled forward into current funds.')}${recentTransactionsBlock(12)}`); bindRefresh();}
  function renderSeats(){layout('Seats','Seat Standings','Each ticket is treated as its own seat account. Dennis Seat 2 replaces the former fourth seat in 2026.',`<div class="grid">${DATA.seatAccounts.filter(s=>s.activeTo==='Current').map(s=>card(s.seat,money(s.balance),`Owner: ${s.owner}`)).join('')}</div><p class="eyebrow" style="margin-top:26px">Seat Accounts</p>${table(['Seat','Owner','Active From','Active To'],DATA.seatAccounts.map(s=>[s.seat,s.owner,s.activeFrom,s.activeTo]))}`);}
  function renderParking(){const total=DATA.parking.reduce((a,p)=>a+p.amount,0); layout('Parking','Parking Pass Tracker','Parking is separate from game tickets and allocated at the member level, not the seat level.',`<div class="grid">${DATA.parking.map(p=>card(`${p.year} Parking`,money(p.amount),p.amount?'member-level split':'nothing yet')).join('')}${card('Lifetime Parking',money(total),'total handled')}</div>${liveLedger.loaded?recentTransactionsBlock(5):''}`); bindRefresh();}
  function renderHistory(){layout('Hoosier History','Season Rewind','History gives the dashboard some soul, but it stays separate from the accounting ledger.',`${table(['Season','Record','Games','Note'],DATA.history.map(h=>[h.season,h.record,h.games,h.note]))}<p class="eyebrow" style="margin-top:26px">2025 Championship Run</p>${table(['Date','Game','Result','Flag'],DATA.postseason2025.map(g=>[g.date,g.game,g.result,g.flag]))}`);}
  function renderSettle(){layout('Settlement','Settlement Snapshot','If the shared account were closed today, this is what each active fund would receive based on the active 2026 ledger.',`${table(['Fund','Settlement'],DATA.activeFunds.map(f=>[f.name,money(f.balance)]))}${notice('<b>Assumption:</b> actual bank balance equals calculated ledger balance. No separate bank reconciliation field is used yet.')}`);}

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
  function applyPreset(){const p=selectedPreset(); $('#txAsset').value=p.assetType; $('#txCategory').value=p.category; $('#txType').value=p.transactionType; $('#txAllocation').value=p.allocationType; $('#txOwner').value=p.owner; if(!$('#txDesc').value) $('#txDesc').value=p.description; const amt=$('#txAmount'); if(p.sign==='negative'&&Number(amt.value||0)>0)amt.value=String(-Math.abs(Number(amt.value))); if(p.sign==='positive'&&Number(amt.value||0)<0)amt.value=String(Math.abs(Number(amt.value)));}
  function buildTransactionPreview(){
    const date=$('#txDate').value||new Date().toISOString().slice(0,10); const assetType=$('#txAsset').value; const amount=round2($('#txAmount').value||0); const owner=$('#txOwner').value; const description=($('#txDesc').value||'').trim(); const season=Number($('#txSeason').value||seasonFromDate(date)); const allocationType=$('#txAllocation').value; const category=$('#txCategory').value; const transactionType=$('#txType').value; const gameId=($('#txGameId').value||'').trim(); const game=($('#txGame').value||'').trim(); const notes=($('#txNotes').value||'').trim();
    const a=allocation(owner,allocationType,assetType,amount); return {date,sourceYear:season,sourceRow:'',season,gameId,game,assetType,category,transactionType,description,allocationType:a.allocationType,totalAmount:amount,owner,notes,allocation:a};
  }
  function validationErrors(p){const errs=[]; if(!p.date)errs.push('Transaction date is required.'); if(!p.description)errs.push('Description is required.'); if(!Number.isFinite(p.totalAmount)||p.totalAmount===0)errs.push('Amount must be a non-zero number.'); if(p.assetType==='Parking'&&!['Member Split','Dennis Joel Kyle Split','Member Specific'].includes(p.allocationType))errs.push('Parking should be allocated at member level, not seat level.'); if(!connection.connected)errs.push('Connect OneDrive before appending.'); if(!connection.isManager)errs.push('Only the configured manager can append rows.'); return errs;}
  function buildTransactionRow(txnId,p){const a=p.allocation; return [txnId,p.sourceYear,p.sourceRow,p.date,p.season,p.gameId,p.game,p.assetType,p.category,p.transactionType,p.description,p.allocationType,p.totalAmount,a.Dennis,a.Joel,a.Kyle,a.Seth,a.Dennis_x2,a.DennisSeat1,a.JoelSeat,a.KyleSeat,a.SethSeat,a.DennisSeat2,'No','',p.notes||'Entered from Hoosier Ticket Command Center web app'];}
  function profileStatus(){if(!connection.connected)return '<b>Status:</b> Not connected. Click Connect OneDrive before writing.'; const email=userEmail(connection.profile); return `<b>Status:</b> Connected as ${email||'Microsoft account'} · ${connection.isManager?'Manager writeback enabled':'Read-only; not manager account'}`;}
  function renderManager(){layout('Manager','Manager Entry','Add a transaction to the OneDrive TransactionsTable. Use Preview first; append only after the row looks right.',`<div class="card"><div class="notice">${profileStatus()}</div><div class="form"><label>Preset<select id="txPreset">${Object.entries(presets).map(([k,p])=>`<option value="${k}">${p.label}</option>`).join('')}</select></label><label>Transaction date<input type="date" id="txDate"></label><label>Season<input id="txSeason" type="number" value="2026"></label><label>Game ID<input id="txGameId" placeholder="ex: 2026-01"></label><label class="wide">Game / event<input id="txGame" placeholder="ex: IU vs Purdue"></label><label>Asset type<select id="txAsset"><option>Game Ticket</option><option>Parking</option><option>Fee</option><option>Adjustment</option><option>Travel</option><option>Fund</option></select></label><label>Category<input id="txCategory" value="Manual Entry"></label><label>Transaction type<input id="txType" value="Manual Entry"></label><label>Allocation type<select id="txAllocation"><option>Member Specific</option><option>Seat Owner Only</option><option>Seat Split</option><option>Member Split</option><option>Dennis Joel Kyle Split</option></select></label><label>Owner / split<select id="txOwner"><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Seth</option><option>Dennis x 2</option><option>All Members</option><option>All Active Seats</option><option>Dennis Joel Kyle</option></select></label><label>Amount<input id="txAmount" type="number" step="0.01" placeholder="0.00"></label><label class="wide">Description<textarea id="txDesc" placeholder="Example: IU vs Purdue parking resale"></textarea></label><label class="wide">Notes<textarea id="txNotes" placeholder="Optional notes"></textarea></label></div><p><button class="btn" id="previewBtn">Preview row</button> <button class="btn" id="appendBtn">Append to OneDrive table</button> <button class="btn" id="refreshManagerBtn">Refresh workbook</button></p><pre class="notice" id="previewBox">No row preview yet.</pre><div class="notice"><b>Tip:</b> Sales and resale should usually be positive. Purchases, fees, and reimbursements paid from the fund should usually be negative.</div></div>${recentTransactionsBlock(8)}`); setTimeout(bindManager,0); bindRefresh();}
  function bindManager(){const today=new Date().toISOString().slice(0,10); $('#txDate').value=today; $('#txPreset').onchange=applyPreset; applyPreset(); $('#previewBtn').onclick=()=>{const p=buildTransactionPreview(); const errs=validationErrors(p); $('#previewBox').textContent=JSON.stringify({readyToAppend:errs.length===0,validation:errs,preview:p,rowShape:buildTransactionRow('TXN-NEXT',p)},null,2);}; $('#refreshManagerBtn').onclick=async()=>{await refreshLedger(); show('manager');}; $('#appendBtn').onclick=async()=>{try{if(!window.HTCC_GRAPH||!window.HTCC_GRAPH.appendTransaction)throw new Error('Graph writeback client not loaded.'); const p=buildTransactionPreview(); const errs=validationErrors(p); if(errs.length)throw new Error(errs.join(' ')); $('#previewBox').textContent='Appending row to OneDrive...'; const txnId=await window.HTCC_GRAPH.nextTransactionId(); const row=buildTransactionRow(txnId,p); const result=await window.HTCC_GRAPH.appendTransaction(row); liveLedger.lastWrite={txnId,row,result,at:new Date()}; await refreshLedger(); $('#previewBox').textContent=JSON.stringify({status:'Appended and refreshed from OneDrive TransactionsTable',txnId,row,graphResult:result,liveRows:liveLedger.transactions.length},null,2); alert('Appended '+txnId+' and refreshed workbook data.'); show('manager');}catch(e){console.error('Append failed',e); $('#previewBox').textContent='Append failed: '+(e.message||String(e)); alert('Append failed: '+(e.message||String(e)));}};}

  const renderers={score:renderScore,money:renderMoney,seats:renderSeats,parking:renderParking,history:renderHistory,settle:renderSettle,manager:renderManager};
  function show(id){try{current=id; document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.screen===id)); (renderers[id]||renderScore)();}catch(err){console.error('HTCC render failure',id,err); $('#app').innerHTML=`<section><p class="eyebrow">App error</p><h2>Something failed to render</h2>${notice('<b>Error:</b> '+(err&&err.message?err.message:String(err)),'danger')}</section>`;}}
  async function connectOneDrive(){if(!window.HTCC_GRAPH)throw new Error('Graph client not loaded'); const res=await window.HTCC_GRAPH.connect(); connection.connected=true; connection.profile=res.profile||null; const email=userEmail(connection.profile); connection.isManager=!!email&&email===managerEmail(); await refreshLedger(); setMode(); show(current); alert('Connected as '+(email||'Microsoft account')+(connection.isManager?' · Manager writeback enabled':' · Read-only account')+'. Workbook rows loaded: '+(liveLedger.transactions.length||0));}
  function init(){try{setMode(); const n=$('#bottomNav'); n.innerHTML=screens.map(([id,icon,label])=>`<button class="navbtn" data-screen="${id}"><span>${icon}</span>${label}</button>`).join(''); n.onclick=e=>{const b=e.target.closest('button[data-screen]'); if(b)show(b.dataset.screen);}; const cb=$('#connectBtn'); if(cb)cb.onclick=async()=>{try{await connectOneDrive();}catch(e){alert(e.message||String(e));}}; show('score');}catch(e){console.error(e); $('#app').innerHTML=`<div class="notice danger"><b>Startup failed:</b> ${e.message||String(e)}</div>`;}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
