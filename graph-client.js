(function(){
  function cfg(){return window.HTCC_CONFIG||{};}
  function msalReady(){return !!(window.msal && cfg().clientId && (cfg().authMode==='graph' || cfg().graphEnabled));}
  async function connect(){
    if(!msalReady()) throw new Error('MSAL is not ready or Graph mode is not enabled.');
    const c=cfg();
    const app=new msal.PublicClientApplication({auth:{clientId:c.clientId,authority:c.authority||('https://login.microsoftonline.com/'+(c.tenantId||'consumers')),redirectUri:c.redirectUri},cache:{cacheLocation:'sessionStorage'}});
    const result=await app.loginPopup({scopes:c.scopes||['User.Read','Files.ReadWrite']});
    return {account:result.account, token:result.accessToken};
  }
  window.HTCC_GRAPH={msalReady,connect};
})();
