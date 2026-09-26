const STORAGE_KEY = 'postLoginRedirect';

// Session-scoped so a stale value never survives to a later, unrelated login.
export function setPostLoginRedirect(path) {
  try {
    if (path && path !== '/login') {
      sessionStorage.setItem(STORAGE_KEY, path);
    }
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — falls back to the default dashboard redirect
  }
}

export function consumePostLoginRedirect() {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return path;
  } catch {
    return null;
  }
}
