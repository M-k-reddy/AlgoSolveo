// AlgoSolveo <-> Supabase: Google sign-in, session refresh, hosted AI, progress sync.
// Load AFTER supabase-config.js and BEFORE sidepanel.js in sidepanel.html.
// Uses plain fetch (no npm/bundler needed).

const Auth = (() => {
  const SESSION_KEY = "supabaseSession";

  // ---------- session storage ----------
  async function getSession() {
    const r = await chrome.storage.local.get(SESSION_KEY);
    return r[SESSION_KEY] || null;
  }
  async function setSession(s) {
    if (s) await chrome.storage.local.set({ [SESSION_KEY]: s });
    else await chrome.storage.local.remove(SESSION_KEY);
  }

  // ---------- sign in with Google ----------
  async function signInWithGoogle() {
    const redirectTo = chrome.identity.getRedirectURL(); // https://<extension-id>.chromiumapp.org/
    const authUrl =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
      `&redirect_to=${encodeURIComponent(redirectTo)}`;

    const resultUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
    if (!resultUrl) throw new Error("Sign-in was cancelled.");

    const hash = new URL(resultUrl).hash.slice(1);
    const p = new URLSearchParams(hash);
    if (p.get("error")) throw new Error(p.get("error_description") || p.get("error"));

    const session = {
      access_token: p.get("access_token"),
      refresh_token: p.get("refresh_token"),
      expires_at: Number(p.get("expires_at")) || Math.floor(Date.now() / 1000) + Number(p.get("expires_in") || 3600),
    };
    if (!session.access_token) throw new Error("No session returned from sign-in.");
    session.user = await fetchUser(session.access_token);
    await setSession(session);
    return session;
  }

  async function fetchUser(accessToken) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Could not load your account.");
    const u = await res.json();
    return { id: u.id, email: u.email, name: u.user_metadata?.full_name, avatar: u.user_metadata?.avatar_url };
  }

  // ---------- keep the session fresh ----------
  async function getValidSession() {
    const s = await getSession();
    if (!s) return null;
    const now = Math.floor(Date.now() / 1000);
    if (s.expires_at - now > 60) return s;

    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) {
      await setSession(null);
      return null;
    }
    const d = await res.json();
    const fresh = {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at || now + d.expires_in,
      user: s.user,
    };
    await setSession(fresh);
    return fresh;
  }

  async function signOut() {
    const s = await getSession();
    if (s) {
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}` },
      }).catch(() => {});
    }
    await setSession(null);
  }

  // ---------- authenticated REST helper ----------
  async function rest(path, options = {}) {
    const s = await getValidSession();
    if (!s) throw new Error("Please sign in.");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${s.access_token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`Database error (${res.status})`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ---------- profile / plan ----------
  async function getProfile() {
    const rows = await rest("profiles?select=email,full_name,plan,plan_expires_at,hints_today,hints_reset_at");
    return rows?.[0] || null;
  }

  // ---------- hosted AI (goes through your Edge Function) ----------
  async function askHostedAI(messages, model) {
    const s = await getValidSession();
    if (!s) throw new Error("Please sign in to use AlgoSolveo AI.");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/hint`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${s.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, model }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `AI request failed (${res.status})`);
      err.code = data.code;
      throw err;
    }
    return data; // { text, model, plan, hints_left }
  }

  // ---------- progress sync ----------
  async function pullProgress() {
    const rows = await rest("progress?select=problem_slug");
    return (rows || []).map((r) => r.problem_slug);
  }
  async function markSolved(slug) {
    await rest("progress", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ problem_slug: slug }),
    });
  }
  async function markUnsolved(slug) {
    await rest(`progress?problem_slug=eq.${encodeURIComponent(slug)}`, { method: "DELETE" });
  }
  // Merge local + cloud on sign-in so nobody loses progress
  async function syncProgress(localSlugs) {
    const cloud = await pullProgress();
    const missingInCloud = localSlugs.filter((s) => !cloud.includes(s));
    if (missingInCloud.length) {
      await rest("progress", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(missingInCloud.map((problem_slug) => ({ problem_slug }))),
      });
    }
    return [...new Set([...cloud, ...localSlugs])];
  }

  return {
    signInWithGoogle, signOut, getSession, getValidSession, getProfile,
    askHostedAI, pullProgress, markSolved, markUnsolved, syncProgress,
  };
})();
