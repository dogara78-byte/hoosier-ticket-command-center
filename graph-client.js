(function(){
  let msalApp = null;
  let activeAccount = null;
  let accessToken = null;

  function cfg(){ return window.HTCC_CONFIG || {}; }
  function graphMode(){ const c = cfg(); return c.authMode === 'graph' || c.graphEnabled === true; }
  function msalReady(){ return !!(window.msal && cfg().clientId && graphMode()); }

  function getApp(){
    if(!msalReady()) throw new Error('MSAL is not ready or Graph mode is not enabled.');
    if(msalApp) return msalApp;
    const c = cfg();
    msalApp = new msal.PublicClientApplication({
      auth: {
        clientId: c.clientId,
        authority: c.authority || ('https://login.microsoftonline.com/' + (c.tenantId || 'consumers')),
        redirectUri: c.redirectUri
      },
      cache: { cacheLocation: 'sessionStorage' }
    });
    return msalApp;
  }

  async function getToken(){
    const c = cfg();
    const app = getApp();
    const scopes = c.scopes || ['User.Read','Files.ReadWrite'];
    if(activeAccount){
      try{
        const silent = await app.acquireTokenSilent({ scopes, account: activeAccount });
        accessToken = silent.accessToken;
        return accessToken;
      }catch(e){
        console.warn('Silent token failed; using popup.', e);
      }
    }
    const result = await app.loginPopup({ scopes });
    activeAccount = result.account;
    accessToken = result.accessToken;
    return accessToken;
  }

  async function connect(){
    const token = await getToken();
    return { account: activeAccount, token };
  }

  async function graphFetch(path, options){
    const token = await getToken();
    const url = path.startsWith('https://') ? path : 'https://graph.microsoft.com/v1.0' + path;
    const response = await fetch(url, {
      ...(options || {}),
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(options && options.headers ? options.headers : {})
      }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch(e) { data = text; }
    if(!response.ok){
      const msg = data && data.error ? (data.error.message || data.error.code) : (text || response.statusText);
      const err = new Error('Graph ' + response.status + ': ' + msg);
      err.response = data;
      throw err;
    }
    return data;
  }

  async function getTableRows(tableName){
    const c = cfg();
    const itemId = c.workbook && c.workbook.itemId;
    if(!itemId) throw new Error('Missing workbook.itemId in config.js');
    const table = encodeURIComponent(tableName);
    return graphFetch(`/me/drive/items/${encodeURIComponent(itemId)}/workbook/tables/${table}/rows`);
  }

  async function appendTableRow(tableName, values){
    const c = cfg();
    const itemId = c.workbook && c.workbook.itemId;
    if(!itemId) throw new Error('Missing workbook.itemId in config.js');
    const table = encodeURIComponent(tableName);
    return graphFetch(`/me/drive/items/${encodeURIComponent(itemId)}/workbook/tables/${table}/rows/add`, {
      method: 'POST',
      body: JSON.stringify({ values: [values] })
    });
  }

  async function nextTransactionId(){
    const c = cfg();
    const tableName = (c.workbook && c.workbook.tables && c.workbook.tables.transactions) || 'TransactionsTable';
    try{
      const rows = await getTableRows(tableName);
      const values = (rows.value || []).map(r => r.values && r.values[0] && r.values[0][0]).filter(Boolean);
      let max = 0;
      values.forEach(v => {
        const m = String(v).match(/TXN-(\d+)/i);
        if(m) max = Math.max(max, parseInt(m[1], 10));
      });
      return 'TXN-' + String(max + 1).padStart(4, '0');
    }catch(e){
      console.warn('Could not calculate next TXN number; using timestamp fallback.', e);
      return 'TXN-' + new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
    }
  }

  async function appendTransaction(rowValues){
    const c = cfg();
    const tableName = (c.workbook && c.workbook.tables && c.workbook.tables.transactions) || 'TransactionsTable';
    return appendTableRow(tableName, rowValues);
  }

  window.HTCC_GRAPH = { msalReady, connect, getToken, graphFetch, appendTableRow, appendTransaction, nextTransactionId };
})();
