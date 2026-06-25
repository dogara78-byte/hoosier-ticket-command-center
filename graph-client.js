(function(){
  function cfg(){return window.HTCC_CONFIG || {};}
  function graphReady(){const c=cfg(); return c.authMode === 'graph' || c.graphEnabled === true;}
  function msalReady(){return typeof window.msal !== 'undefined' && !!window.msal.PublicClientApplication;}
  async function connect(){
    const c=cfg();
    if(!graphReady()) throw new Error('Graph mode is not enabled in config.js');
    if(!msalReady()) throw new Error('MSAL did not load. Check browser/ad blocker or CDN access.');
    const msalConfig={auth:{clientId:c.clientId, authority:c.authority || ('https://login.microsoftonline.com/' + (c.tenantId||'consumers')), redirectUri:c.redirectUri}, cache:{cacheLocation:'sessionStorage'}};
    const app=new msal.PublicClientApplication(msalConfig);
    const result=await app.loginPopup({scopes:c.scopes||['User.Read','Files.ReadWrite']});
    window.HTCC_AUTH={account:result.account, token:result.accessToken, msalApp:app};
    return result;
  }
  window.HTCC_GRAPH={graphReady,msalReady,connect};
})();
