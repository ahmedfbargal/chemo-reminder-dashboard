(function () {
  'use strict';

  const config = window.CHEMO_SHARED_CONFIG ?? {};
  const url = String(config.url ?? '').trim().replace(/\/+$/, '');
  const publishableKey = String(config.publishableKey ?? '').trim();
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) &&
    /^sb_publishable_[\w-]+$/.test(publishableKey);
  const storageKey = 'chemo-shared-auth:' + url + ':' + location.pathname.replace(/index\.html$/, '');
  let session = null;
  let refreshTask = null;

  function saveSession(value) {
    session = value;
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch {}
  }
  function acceptSession(data) {
    const expiresAt = Number(data?.expires_at) || Date.now() / 1000 + Number(data?.expires_in);
    if (typeof data?.access_token !== 'string' || typeof data?.refresh_token !== 'string' ||
        !Number.isFinite(expiresAt)) throw new Error('Sign-in did not return a valid session.');
    saveSession({access_token:data.access_token, refresh_token:data.refresh_token, expires_at:expiresAt});
  }
  if (configured) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey));
      if (stored) acceptSession(stored);
    } catch { saveSession(null); }
  }

  async function request(path, body, token) {
    const headers = {apikey:publishableKey, 'Content-Type':'application/json'};
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(url + path, {
      method:'POST', headers, body:JSON.stringify(body), cache:'no-store',
      signal:AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error('The shared service could not complete the request.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function refresh(force = false) {
    if (!session) throw Object.assign(new Error('Sign in to open the shared board.'), {status:401});
    if (!force && session.expires_at > Date.now() / 1000 + 45) return session.access_token;
    if (!refreshTask) {
      refreshTask = request('/auth/v1/token?grant_type=refresh_token', {refresh_token:session.refresh_token})
        .then(data => { acceptSession(data); return session.access_token; })
        .catch(error => { if ([400,401,403].includes(error.status)) saveSession(null); throw error; })
        .finally(() => { refreshTask = null; });
    }
    return refreshTask;
  }
  async function rpc(name, args) {
    const path = '/rest/v1/rpc/' + name;
    const token = await refresh();
    try { return await request(path,args,token); }
    catch (error) {
      if (error.status !== 401) throw error;
      return request(path,args,await refresh(true));
    }
  }
  window.chemoSharedStore = {
    configured,
    hasSession: () => Boolean(session),
    async signIn(email,password) {
      acceptSession(await request('/auth/v1/token?grant_type=password',{email,password}));
    },
    async signOut() {
      const token = session?.access_token;
      saveSession(null);
      if (token) await request('/auth/v1/logout?scope=local',{},token).catch(() => {});
    },
    load: () => rpc('chemo_full_board_load',{}),
    save: ({expectedRevision,state,writeId}) => rpc('chemo_full_board_save',{
      expected_revision:expectedRevision, board_state:state, write_id:writeId
    })
  };
})();
