import { AccountInfo, InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, msalReady, API_SCOPE } from "./msal";
import { acquireTokenViaDialog, getCachedToken, setCachedToken } from "./dialogAuth";
import { DBG } from "./debug";

const request = { scopes: [API_SCOPE] as string[] };

function activeAccount(): AccountInfo | null {
  return msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;
}

let refreshTimer: number | null = null;
function scheduleSilentRefresh(expSeconds: number) {
  try {
    if (refreshTimer) window.clearTimeout(refreshTimer as any);
  } catch {}
  const msUntilRefresh = Math.max(expSeconds * 1000 - Date.now() - 5 * 60 * 1000, 15_000);
  refreshTimer = window.setTimeout(async () => {
    try {
      const acc = activeAccount();
      if (!acc) return;
      const res = await msalInstance.acquireTokenSilent({
        ...request,
        account: acc,
        forceRefresh: true,
      });
      setCachedToken(res.accessToken);
      const exp = Math.floor((res.expiresOn?.getTime() ?? Date.now() + 3600_000) / 1000);
      scheduleSilentRefresh(exp);
      DBG.log("Token silently refreshed");
    } catch (e) {
      DBG.warn("Background silent refresh failed", e);
    }
  }, msUntilRefresh) as any;
}

export async function getApiAccessToken(opts?: { noUI?: boolean }): Promise<string> {
  const cached = getCachedToken();
  if (cached) return cached;

  await msalReady;

  const account = activeAccount();
  if (account) {
    try {
      DBG.log("acquireTokenSilent start");
      const res = await msalInstance.acquireTokenSilent({ ...request, account });
      setCachedToken(res.accessToken);
      const exp = Math.floor((res.expiresOn?.getTime() ?? Date.now() + 3600_000) / 1000);
      scheduleSilentRefresh(exp);
      DBG.log("acquireTokenSilent ok");
      return res.accessToken;
    } catch (e) {
      DBG.warn("acquireTokenSilent failed", e);
      if (!(e instanceof InteractionRequiredAuthError)) throw e;
    }
  }

  if (opts?.noUI) {
    throw new Error("No cached token and UI disabled");
  }
  DBG.log("Falling back to dialog auth");
  const t = await acquireTokenViaDialog();
  setCachedToken(t);
  DBG.log("Dialog returned token");
  return t;
}
