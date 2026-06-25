// Microsoft Graph / OneDrive bridge. Fallback JSON still renders the app if Graph is unavailable.
(function(){
  const cfg = window.HTCC_CONFIG || {authMode:'fallback'};
  let msalInstance = null;
  let activeAccount = null;

  function graphRequested(){
    return cfg.authMode === 'graph' || cfg.graphEnabled === true;
  }
  function isGraphConfigured(){
    return graphRequested() && cfg.clientId && !String(cfg.clientId).startsWith('YOUR_');
  }
  function authority(){
    return cfg.authority || `https://login.microsoftonline.com/${cfg.tenantId || 'consumers'}`;
  }

  async function init(){
    if(!isGraphConfigured()) return {mode:'Fallback JSON'};
    if(!window.msal) return {mode:'Graph configured - MSAL blocked'};

    msalInstance = new msal.PublicClientApplication({
      auth:{ clientId: cfg.clientId, authority: authority(), redirectUri: cfg.redirectUri },
      cache:{ cacheLocation:'sessionStorage', storeAuthStateInCookie:false }
    });

    await msalInstance.initialize();
    const result = await msalInstance.handleRedirectPromise();
    if(result && result.account) activeAccount = result.account;
    if(!activeAccount){
      const accounts = msalInstance.getAllAccounts();
      if(accounts.length) activeAccount = accounts[0];
    }
    return {mode: activeAccount ? 'OneDrive connected' : 'Graph ready'};
  }

  async function signIn(){
    if(!isGraphConfigured()) throw new Error('Graph is not configured yet. Fill config.js after Microsoft app registration.');
    if(!window.msal) throw new Error('Microsoft sign-in library did not load. Check browser extensions/ad blockers or try another browser.');
    if(!msalInstance) await init();
    await msalInstance.loginRedirect({scopes: cfg.scopes || ['Files.ReadWrite','User.Read']});
  }

  async function token(){
    if(!activeAccount) throw new Error('Not signed in.');
    const request = {account: activeAccount, scopes: cfg.scopes || ['Files.ReadWrite','User.Read']};
    try { return (await msalInstance.acquireTokenSilent(request)).accessToken; }
    catch(e){ return (await msalInstance.acquireTokenPopup(request)).accessToken; }
  }

  async function graph(path, options={}){
    const t = await token();
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, { ...options, headers:{'Authorization':`Bearer ${t}`,'Content-Type':'application/json',...(options.headers||{})} });
    if(!res.ok) throw new Error(`Graph error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async function readTable(tableName){
    const {driveId,itemId} = cfg.workbook || {};
    const rows = await graph(`/drives/${driveId}/items/${itemId}/workbook/tables/${tableName}/range`);
    return rows.values;
  }

  async function appendTransaction(values){
    const {driveId,itemId,tables} = cfg.workbook || {};
    return graph(`/drives/${driveId}/items/${itemId}/workbook/tables/${tables.transactions}/rows/add`, {
      method:'POST', body: JSON.stringify({ values:[values] })
    });
  }

  window.HTCC_GRAPH = {init, signIn, readTable, appendTransaction, isGraphConfigured, graphRequested};
})();
