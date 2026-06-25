const state = { data:null, view:'score', graphMode:false };
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const money = n => (Number(n)||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2});
const money0 = n => (Number(n)||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const esc = s => String(s ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

window.addEventListener('DOMContentLoaded', boot);
async function boot(){
  try{
    $$('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
    $('#signInBtn').addEventListener('click', connectGraph);
    const mode = await window.HTCC_GRAPH?.init?.();
    $('#dataMode').textContent = mode?.mode || 'Fallback JSON';
    state.graphMode = mode?.mode === 'OneDrive connected';
    state.data = await loadFallback();
    setView('score');
  }catch(e){ showError(e); }
}
async function loadFallback(){
  try{
    const r = await fetch('data/ledger-fallback.json',{cache:'no-store'});
    if(!r.ok) throw new Error('Could not load data/ledger-fallback.json');
    return await r.json();
  }catch(e){
    throw new Error('Data did not load. If you opened the HTML directly, run it from a local server or host it on GitHub Pages. Details: '+e.message);
  }
}
async function connectGraph(){
  try{ await window.HTCC_GRAPH.signIn(); }
  catch(e){ alert(e.message); }
}
function setView(view){
  state.view = view;
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  const renderers = {score, moneyView, seats, parking, history, settle, manager};
  $('#screen').innerHTML = renderers[view]();
  if(view==='manager') wireManager();
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
  <p class="eyebrow">Active Funds</p><div class="grid member-grid">${Object.entries(c.fundBalances).map(([m,v])=>memberCard(m,v,c.rollForwardFrom2025[m],c.cashPaid2026[m])).join('')}</div>
  <section class="note-card"><strong>Source of truth:</strong> ${esc(d.meta.sourceOfTruth)} ${esc(c.note)}</section>`;
}
function memberCard(m,v,carry,cash){ return `<article class="card"><h3 class="member-name">${esc(m)}</h3><div class="money">${money(v)}</div><div class="small-row"><span>Roll-forward</span><b>${money(carry||0)}</b></div><div class="small-row"><span>2026 cash paid</span><b>${money(cash||0)}</b></div></article>`; }
function moneyView(){
  const h=state.data.historical;
  return `${title('Money','Money by Season','Sales handled are historical throughput. They are not the same thing as the current account balance.')}
  <div class="grid kpi-grid">${kpi('2024 sales',money(h.salesByYear['2024']),'tickets + parking')}${kpi('2025 sales',money(h.salesByYear['2025']),'tickets + parking')}${kpi('Ticket sales',money(h.lifetimeTicketSales),'lifetime regular ticket sales')}${kpi('Parking sales',money(h.lifetimeParkingSales),'member-level split','good')}</div>
  <p class="eyebrow">Year Split</p>${simpleTable(['Year','Tickets','Parking','Total'], Object.keys(h.salesByYear).map(y=>[y,money(h.ticketSalesByYear[y]||0),money(h.parkingSalesByYear[y]||0),money(h.salesByYear[y]||0)]))}
  <section class="note-card"><strong>Accuracy guardrail:</strong> ${esc(h.priorBugNote)}</section>`;
}
function seats(){
  const d=state.data, c=d.current;
  return `${title('Seats','Seat Standings','Each ticket is treated as its own seat account. Dennis Seat 2 replaces the former fourth seat in 2026.')}
  <div class="grid seat-grid">${Object.entries(c.seatBalances).map(([s,v])=>`<article class="card"><h3 class="member-name">${esc(s)}</h3><div class="money">${money(v)}</div><div class="small-row"><span>Active season</span><b>2026</b></div></article>`).join('')}</div>
  <p class="eyebrow">Seat Accounts</p>${simpleTable(['Seat','Owner','Active From','Active To'], d.seatAccounts.map(s=>[s.SeatLabel,s.OwnerMember,s.ActiveFrom,s.ActiveTo||'Current']))}`;
}
function parking(){
  const h=state.data.historical;
  return `${title('Parking','Parking Pass Tracker','Parking is separate from game tickets and allocated at the member level, not the seat level.')}
  <div class="grid kpi-grid">${kpi('2024 parking',money(h.parkingSalesByYear['2024']),'member-level split')}${kpi('2025 parking',money(h.parkingSalesByYear['2025']),'member-level split')}${kpi('2026 parking',money(h.parkingSalesByYear['2026']),'nothing yet')}${kpi('Lifetime parking',money(h.lifetimeParkingSales),'total handled','good')}</div>`;
}
function history(){
  const games = state.data.games;
  const bySeason = {};
  games.forEach(g=>{bySeason[g.Season] ||= {w:0,l:0,games:[]}; if(g.WinLoss==='W')bySeason[g.Season].w++; if(g.WinLoss==='L')bySeason[g.Season].l++; bySeason[g.Season].games.push(g);});
  const rows = Object.entries(bySeason).map(([s,x])=>[s, `${x.w}-${x.l}`, x.games.length, (x.games.find(g=>/National Championship/.test(g.SpecialFlag))?'🏆 National Champions':'')]);
  const playoff = games.filter(g=>g.Season===2025 && /Postseason|Championship|Bowl|CFP/.test(g.SpecialFlag||''));
  return `${title('Hoosier History','Season Rewind','History gives the dashboard some soul, but it stays separate from the accounting ledger.')}
  ${simpleTable(['Season','Record','Games','Note'], rows)}
  <p class="eyebrow">2025 Championship Run</p>${simpleTable(['Date','Game','Result','Flag'], playoff.map(g=>[g.Date,`${g.Opponent} · ${g.Stadium}`,`${g.Result} ${g.IUScore}-${g.OpponentScore}`,g.SpecialFlag]))}`;
}
function settle(){
  const c=state.data.current;
  return `${title('Settlement','Settlement Snapshot','If the shared account were closed today, this is what each active fund would receive based on the active 2026 ledger.')}
  ${simpleTable(['Fund','Settlement'], Object.entries(c.settlement).map(([m,v])=>[m,money(v)]))}
  <section class="note-card"><strong>Assumption:</strong> actual bank balance equals calculated ledger balance. No separate bank reconciliation field is included yet.</section>`;
}
function manager(){
  return `${title('Manager','Manager Entry Roadmap','For now, Excel stays official. After Microsoft Graph is configured, this screen will append rows to the Transactions table in OneDrive.')}
  <section class="card"><div class="form-grid"><div class="field"><label>Transaction date</label><input type="date" id="txnDate"></div><div class="field"><label>Asset type</label><select id="asset"><option>Game Ticket</option><option>Parking</option><option>Fees/Taxes</option><option>Postseason</option><option>Adjustment</option></select></div><div class="field"><label>Amount</label><input type="number" step="0.01" id="amount" placeholder="0.00"></div><div class="field"><label>Owner / split</label><select id="owner"><option>All Members</option><option>Dennis</option><option>Joel</option><option>Kyle</option><option>Dennis x 2</option></select></div><div class="field"><label>Description</label><textarea id="desc" placeholder="Example: IU vs Purdue parking resale"></textarea></div></div><div class="manager-actions"><button class="gold-btn" id="mockSubmit">Preview row</button><button class="gold-btn" id="graphSubmit">Append to OneDrive table</button></div><pre id="managerOutput" class="note-card">No row preview yet.</pre></section>`;
}
function wireManager(){
  $('#mockSubmit')?.addEventListener('click',()=>{$('#managerOutput').textContent=JSON.stringify(managerRow(),null,2)});
  $('#graphSubmit')?.addEventListener('click',async()=>{
    try{ await window.HTCC_GRAPH.appendTransaction(Object.values(managerRow())); $('#managerOutput').textContent='Row submitted to OneDrive workbook.'; }
    catch(e){ $('#managerOutput').textContent='Graph writeback is not configured yet: '+e.message; }
  });
}
function managerRow(){ return {TxnDate:$('#txnDate').value, AssetType:$('#asset').value, Amount:Number($('#amount').value||0), Owner:$('#owner').value, Description:$('#desc').value, EnteredBy:'Dennis', Status:'Draft'}; }
function simpleTable(headers, rows){ return `<div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i>0?'num':''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function showError(e){ console.error(e); $('#screen').innerHTML = `<section class="error-card"><h2>Something blocked the app.</h2><p>${esc(e.message)}</p></section>`; }
