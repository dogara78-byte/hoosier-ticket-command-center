const state = { data:null, view:'score', graphMode:false, graphStatus:'Fallback JSON' };
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const money = n => (Number(n)||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2});
const money0 = n => (Number(n)||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const esc = s => String(s ?? '').replace(/[&<>\"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

window.addEventListener('DOMContentLoaded', boot);

async function boot(){
  try{
    $$('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
    $('#signInBtn').addEventListener('click', connectGraph);

    const mode = await window.HTCC_GRAPH?.init?.();
    state.graphStatus = mode?.mode || 'Fallback JSON';
    state.graphMode = mode?.mode === 'OneDrive connected';
    $('#dataMode').textContent = state.graphStatus;

    state.data = await loadFallback();
    setView('score');
  }catch(e){ showError(e); }
}

async function loadFallback(){
  const candidates = ['data/ledger-fallback.json','ledger-fallback.json','HOSTED_APP_ledger_ACCURATE.json'];
  let last = null;
  for (const path of candidates){
    try{
      const r = await fetch(path,{cache:'no-store'});
      if(r.ok){
        const raw = await r.json();
        return normalizeData(raw);
      }
      last = new Error(`${path}: ${r.status}`);
    }catch(e){ last = e; }
  }
  throw new Error('Data did not load. Confirm data/ledger-fallback.json is uploaded beside the app files. Details: '+(last?.message||last));
}

function normalizeData(raw){
  // Graph-ready JSON already has current/historical. Older JSON has summaries.
  if(raw.current && raw.historical) return raw;
  if(raw.summaries){
    const s = raw.summaries;
    return {
      meta: { sourceOfTruth:'Excel workbook in OneDrive remains the source of truth until Microsoft Graph writeback is live.' },
      current: {
        accountBalance: s.currentCalculatedAccountBalance ?? 0,
        current2026Sales: s.current2026Sales ?? 0,
        fundBalances: s.currentFundBalances || {Dennis:0,Joel:0,Kyle:0,'Dennis x 2':0},
        seatBalances: s.currentSeatBalances || {'Dennis Seat 1':0,'Joel Seat':0,'Kyle Seat':0,'Dennis Seat 2':0},
        settlement: s.currentSettlement || {Dennis:0,Joel:0,Kyle:0,'Dennis x 2':0},
        rollForwardFrom2025: s.rollForward2025To2026 || {},
        cashPaid2026: s.cashPaid2026 || {},
        note: s.dashboardNote || ''
      },
      historical: {
        salesByYear: s.salesByYear || {},
        ticketSalesByYear: s.ticketSalesByYear || {},
        parkingSalesByYear: s.parkingSalesByYear || {},
        lifetimeRegularSales: s.lifetimeRegularSales || 0,
        lifetimeTicketSales: s.lifetimeTicketSales || 0,
        lifetimeParkingSales: s.lifetimeParkingSales || 0,
        priorBugNote: s.priorBugNote || 'Current cash/balance is separated from historical throughput.'
      },
      members: raw.members || [],
      seatAccounts: raw.seatAccounts || [],
      games: raw.games || [],
      transactions: raw.transactions || [],
      needsReview: raw.needsReview || [],
      sources: raw.sources || {}
    };
  }
  throw new Error('Unsupported ledger JSON shape.');
}

async function connectGraph(){
  try{ await window.HTCC_GRAPH.signIn(); }
  catch(e){ alert(e.message); }
}

function setView(view){
  state.view = view;
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  const renderers = {score, moneyView, seats, parking, history, settle, manager};
  const renderer = renderers[view] || score;
  try{
    $('#screen').innerHTML = renderer();
    if(view==='manager') wireManager();
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){
    console.error('Screen render failed', view, e);
    $('#screen').innerHTML = `<section class="error-card"><h2>${esc(view)} page failed</h2><p>${esc(e.message)}</p></section>`;
  }
}

function title(eyebrow, heading, lede){ return `<p class="eyebrow">${eyebrow}</p><h2 class="screen-title">${heading}</h2><p class="lede">${lede}</p>`; }
function kpi(label,value,hint,cls=''){ return `<article class="card kpi"><div class="label">${label}</div><div class="value ${cls}">${value}</div><div class="hint">${hint}</div></article>`; }

function score(){
  const d=state.data, c=d.current, h=d.historical;
  return `${title('Scoreboard','Game Day Dashboard','Current values are active 2026 fund balances. Historical activity is shown separately so old sales do not pretend to be cash on hand.')}
  <div class="grid kpi-grid">
    ${kpi('Current account balance',money(c.accountBalance),'2026 active ledger','good')}
    ${kpi('2026 sales logged',money(c.current2026Sales||0),'new season activity')}
    ${kpi('Lifetime sales handled',money0(h.lifetimeRegularSales),'2024 + 2025 regular sales')}
    ${kpi('Parking handled',money0(h.lifetimeParkingSales),'tracked separately from seats','good')}
  </div>
  <p class="eyebrow">Active Funds</p><div class="grid member-grid">${Object.entries(c.fundBalances||{}).map(([m,v])=>memberCard(m,v,(c.rollForwardFrom2025||{})[m],(c.cashPaid2026||{})[m])).join('')}</div>
  <section class="note-card"><strong>Source of truth:</strong> ${esc(d.meta?.sourceOfTruth||'Excel workbook in OneDrive remains source of truth.')} ${esc(c.note||'')}</section>`;
}
function memberCard(m,v,carry,cash){ return `<article class="card"><h3 class="member-name">${esc(m)}</h3><div class="money">${money(v)}</div><div class="small-row"><span>Roll-forward</span><b>${money(carry||0)}</b></div><div class="small-row"><span>2026 cash paid</span><b>${money(cash||0)}</b></div></article>`; }

function moneyView(){
  const h=state.data.historical || {};
  const years = Object.keys(h.salesByYear || {}).sort();
  return `${title('Money','Money by Season','Sales handled are historical throughput. They are not the same thing as the current account balance.')}
  <div class="grid kpi-grid">
    ${kpi('2024 sales',money((h.salesByYear||{})['2024']||0),'tickets + parking')}
    ${kpi('2025 sales',money((h.salesByYear||{})['2025']||0),'tickets + parking')}
    ${kpi('Ticket sales',money(h.lifetimeTicketSales||0),'lifetime regular ticket sales')}
    ${kpi('Parking sales',money(h.lifetimeParkingSales||0),'member-level split','good')}
  </div>
  <p class="eyebrow">Year Split</p>${simpleTable(['Year','Tickets','Parking','Total'], years.map(y=>[y,money((h.ticketSalesByYear||{})[y]||0),money((h.parkingSalesByYear||{})[y]||0),money((h.salesByYear||{})[y]||0)]))}
  <section class="note-card"><strong>Accuracy guardrail:</strong> ${esc(h.priorBugNote || 'Current active balances are kept separate from historical sales activity.')}</section>`;
}

function seats(){
  const d=state.data, c=d.current;
  return `${title('Seats','Seat Standings','Each ticket is treated as its own seat account. Dennis Seat 2 replaces the former fourth seat in 2026.')}
  <div class="grid seat-grid">${Object.entries(c.seatBalances||{}).map(([s,v])=>`<article class="card"><h3 class="member-name">${esc(s)}</h3><div class="money">${money(v)}</div><div class="small-row"><span>Active season</span><b>2026</b></div></article>`).join('')}</div>
  <p class="eyebrow">Seat Accounts</p>${simpleTable(['Seat','Owner','Active From','Active To'], (d.seatAccounts||[]).map(s=>[s.SeatLabel,s.OwnerMember,s.ActiveFrom,s.ActiveTo||'Current']))}`;
}
function parking(){
  const h=state.data.historical || {};
  return `${title('Parking','Parking Pass Tracker','Parking is separate from game tickets and allocated at the member level, not the seat level.')}
  <div class="grid kpi-grid">${kpi('2024 parking',money((h.parkingSalesByYear||{})['2024']||0),'member-level split')}${kpi('2025 parking',money((h.parkingSalesByYear||{})['2025']||0),'member-level split')}${kpi('2026 parking',money((h.parkingSalesByYear||{})['2026']||0),'nothing yet')}${kpi('Lifetime parking',money(h.lifetimeParkingSales||0),'total handled','good')}</div>`;
}
function history(){
  const games = state.data.games || [];
  const bySeason = {};
  games.forEach(g=>{bySeason[g.Season] ||= {w:0,l:0,games:[]}; if(g.WinLoss==='W')bySeason[g.Season].w++; if(g.WinLoss==='L')bySeason[g.Season].l++; bySeason[g.Season].games.push(g);});
  const rows = Object.entries(bySeason).sort(([a],[b])=>String(a).localeCompare(String(b))).map(([s,x])=>[s, `${x.w}-${x.l}`, x.games.length, (x.games.find(g=>/National Championship/.test(g.SpecialFlag||''))?'🏆 National Champions':'')]);
  const playoff = games.filter(g=>Number(g.Season)===2025 && /Postseason|Championship|Bowl|CFP/.test(g.SpecialFlag||''));
  return `${title('Hoosier History','Season Rewind','History gives the dashboard some soul, but it stays separate from the accounting ledger.')}
  ${simpleTable(['Season','Record','Games','Note'], rows)}
  <p class="eyebrow">2025 Championship Run</p>${simpleTable(['Date','Game','Result','Flag'], playoff.map(g=>[g.Date,`${g.Opponent} · ${g.Stadium}`,`${g.Result||g.WinLoss||''} ${g.IUScore ?? ''}-${g.OpponentScore ?? ''}`,g.SpecialFlag]))}`;
}
function settle(){
  const c=state.data.current;
  return `${title('Settlement','Settlement Snapshot','If the shared account were closed today, this is what each active fund would receive based on the active 2026 ledger.')}
  ${simpleTable(['Fund','Settlement'], Object.entries(c.settlement||{}).map(([m,v])=>[m,money(v)]))}
  <section class="note-card"><strong>Assumption:</strong> actual bank balance equals calculated ledger balance. No separate bank reconciliation field is included yet.</section>`;
}
function manager(){
  const isConnected = state.graphStatus === 'OneDrive connected';
  return `${title('Manager','Manager Entry Roadmap','For now, Excel stays official. After Microsoft Graph is fully configured, this screen will append rows to the Transactions table in OneDrive.')}
  <section class="card"><div class="form-grid"><div class="field"><label>Transaction date</label><input type="date" id="txnDate"></div><div class="field"><label>Asset type</label><select id="asset"><option>Game Ticket</option><option>Parking</option><option>Fees/Taxes</option><option>Postseason</option><option>Adjustment</option></select></div><div class="field"><label>Amount</label><input type="number" step="0.01" id="amount" placeholder="0.00"></div><div class="field"><label>Owner / split</label><select id="owner"><option>All Members</option><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Seth</option><option>Dennis x 2</option></select></div><div class="field"><label>Description</label><textarea id="desc" placeholder="Example: IU vs Purdue parking resale"></textarea></div></div><div class="manager-actions"><button class="gold-btn" id="mockSubmit">Preview row</button><button class="gold-btn" id="graphSubmit">Append to OneDrive table</button></div><pre id="managerOutput" class="note-card">${isConnected?'OneDrive connected. Preview before append.':'Connect OneDrive first, then preview a row.'}</pre></section>`;
}
function wireManager(){
  $('#mockSubmit')?.addEventListener('click',()=>{$('#managerOutput').textContent=JSON.stringify(managerRow(),null,2)});
  $('#graphSubmit')?.addEventListener('click',async()=>{
    try{ await window.HTCC_GRAPH.appendTransaction(Object.values(managerRow())); $('#managerOutput').textContent='Row submitted to OneDrive workbook.'; }
    catch(e){ $('#managerOutput').textContent='Graph writeback is not ready yet: '+e.message; }
  });
}
function managerRow(){ return {TxnDate:$('#txnDate').value, AssetType:$('#asset').value, Amount:Number($('#amount').value||0), Owner:$('#owner').value, Description:$('#desc').value, EnteredBy:'Dennis', Status:'Draft'}; }
function simpleTable(headers, rows){ return `<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(rows||[]).map(r=>`<tr>${r.map((c,i)=>`<td class="${i>0?'num':''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function showError(e){ console.error(e); $('#screen').innerHTML = `<section class="error-card"><h2>Something blocked the app.</h2><p>${esc(e.message)}</p></section>`; }
