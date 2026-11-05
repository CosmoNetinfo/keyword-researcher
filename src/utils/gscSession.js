export const GSC_EXPIRED_MESSAGE = "Sessione Search Console scaduta: accedi di nuovo";
const TOKEN = "gsc_access_token";
const EXPIRY = "gsc_expires_at";
const EXPIRED = "gsc_session_expired";

export function clearGscSession(expired = false) {
  sessionStorage.removeItem(TOKEN);
  if (expired) {
    sessionStorage.setItem(EXPIRED, "1");
  } else {
    sessionStorage.removeItem(EXPIRY);
    sessionStorage.removeItem(EXPIRED);
  }
}

export function readGscSession() {
  const params = new URLSearchParams(location.hash.slice(1));
  const incoming = params.get("access_token");
  if (incoming) {
    const seconds = Number(params.get("expires_in"));
    clearGscSession();
    sessionStorage.setItem(TOKEN, incoming);
    if (Number.isFinite(seconds) && seconds > 0) sessionStorage.setItem(EXPIRY, String(Date.now() + seconds * 1000));
    history.replaceState(null, "", location.pathname + location.search);
  }
  const expiresAt = Number(sessionStorage.getItem(EXPIRY)) || null;
  const token = sessionStorage.getItem(TOKEN);
  if (token && expiresAt && expiresAt <= Date.now()) clearGscSession(true);
  return { token: sessionStorage.getItem(TOKEN), expiresAt, expired: sessionStorage.getItem(EXPIRED) === "1" };
}

export function isGscExpired(response, data) {
  return response.status === 401 || data?.code === "GSC_SESSION_EXPIRED" || /invalid credentials/i.test(data?.error || "");
}
