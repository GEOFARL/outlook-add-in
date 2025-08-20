import { AccountInfo, InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, msalReady, API_SCOPE } from "./msal";
import { acquireTokenViaDialog, getCachedToken } from "./dialogAuth";
import { DBG } from "./debug";

const request = { scopes: [API_SCOPE] };

function activeAccount(): AccountInfo | null {
  return msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;
}

export async function getApiAccessToken(): Promise<string> {
  const cached = getCachedToken();
  if (cached) {
    DBG.log("Token from in-memory cache");
    return cached;
  }

  await msalReady;

  const account = activeAccount();
  if (account) {
    try {
      DBG.log("Trying acquireTokenSilent for", account.username);
      const res = await msalInstance.acquireTokenSilent({ ...request, account });
      DBG.log("Silent token OK (len):", res.accessToken.length);
      return res.accessToken;
    } catch (e) {
      DBG.warn("Silent token failed:", e);
      if (!(e instanceof InteractionRequiredAuthError)) throw e;
    }
  }

  DBG.log("Falling back to dialog auth");
  const t = await acquireTokenViaDialog();
  DBG.log("Dialog returned token (len):", t.length);
  return t;
}
