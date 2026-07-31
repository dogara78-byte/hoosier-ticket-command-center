(function(){
  const STORAGE_KEY = 'htcc_github_token';

  function cfg(){ return (window.HTCC_CONFIG && window.HTCC_CONFIG.github) || {}; }
  function repoConfigured(){ const c = cfg(); return !!(c.owner && c.repo); }
  function getToken(){ return localStorage.getItem(STORAGE_KEY) || ''; }
  function isConnected(){ return repoConfigured() && !!getToken(); }
  function disconnect(){ localStorage.removeItem(STORAGE_KEY); }

  function b64EncodeUtf8(str){
    return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
  }

  async function apiFetch(path, options){
    const token = getToken();
    if(!token) throw new Error('Not connected to GitHub.');
    const response = await fetch('https://api.github.com' + path, {
      ...(options || {}),
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        ...(options && options.headers ? options.headers : {})
      }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch(e) { data = text; }
    if(!response.ok){
      const msg = data && data.message ? data.message : (text || response.statusText);
      const err = new Error('GitHub ' + response.status + ': ' + msg);
      err.response = data;
      throw err;
    }
    return data;
  }

  async function connect(token){
    if(!repoConfigured()) throw new Error('Missing github.owner/github.repo in config.js');
    const trimmed = String(token || '').trim();
    if(!trimmed) throw new Error('Paste a GitHub token first.');
    localStorage.setItem(STORAGE_KEY, trimmed);
    try{
      const c = cfg();
      await apiFetch(`/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`);
    }catch(e){
      disconnect();
      throw new Error('Token did not work: ' + (e.message || String(e)));
    }
    return true;
  }

  async function publishSnapshot(jsonString){
    if(!isConnected()) throw new Error('Connect GitHub before publishing.');
    const c = cfg();
    const owner = encodeURIComponent(c.owner);
    const repo = encodeURIComponent(c.repo);
    const branch = c.branch || 'main';
    const path = c.path || 'data/public-ledger.json';
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');

    let sha = null;
    try{
      const existing = await apiFetch(`/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`);
      sha = existing && existing.sha;
    }catch(e){
      if(!/GitHub 404/.test(e.message||'')) throw e;
    }

    const body = {
      message: 'Publish member snapshot - ' + new Date().toISOString(),
      content: b64EncodeUtf8(jsonString),
      branch
    };
    if(sha) body.sha = sha;

    const result = await apiFetch(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { commitUrl: result && result.commit && result.commit.html_url, result };
  }

  window.HTCC_GITHUB = { repoConfigured, isConnected, connect, disconnect, publishSnapshot };
})();
