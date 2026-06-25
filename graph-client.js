// Microsoft Graph / OneDrive bridge. Fallback mode works without setup.
(function(){
  const cfg = window.HTCC_CONFIG || {authMode:'fallback'};
  let msalInstance = null;
  let activeAccount = null;

  function isGraphConfigured(){ return cfg.authMode === 'graph' && cfg.clientId && !cfg.clientId.startsWith('YOUR_'); }

  async function init(){
    if(!isGraphConfigured() || !window.msal) return {mode:'Fallback JSON'};
    msalInstance = new msal.PublicClientApplication({
      auth:{ clientId: cfg.clientId, authority:`https://login.microsoftonline.com/${cfg.tenantId || 'consumers'}`, redirectUri: cfg.redirectUri },
      cache:{ cacheLocation:'sessionStorage' }
    });
    await msalInstance.initialize();
    const result = await msalInstance.handleRedirectPromise();
    if(result?.account) activeAccount = result.account;
    if(!activeAccount){
      const accounts = msalInstance.getAllAccounts();
      if(accounts.length) activeAccount = accounts[0];
    }
    return {mode: activeAccount ? 'OneDrive connected' : 'Graph ready'};
  }

  async function signIn(){
    if(!isGraphConfigured()) throw new Error('Graph is not configured yet. Fill config.js after Microsoft app registration.');
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
    const {driveId,itemId} = cfg.workbook;
    const rows = await graph(`/drives/${driveId}/items/${itemId}/workbook/tables/${tableName}/range`);
    return rows.values;
  }

  async function appendTransaction(values){
    const {driveId,itemId,tables} = cfg.workbook;
    return graph(`/drives/${driveId}/items/${itemId}/workbook/tables/${tables.transactions}/rows/add`, {
      method:'POST', body: JSON.stringify({ values:[values] })
    });
  }

  window.HTCC_GRAPH = {init, signIn, readTable, appendTransaction, isGraphConfigured};
})();
