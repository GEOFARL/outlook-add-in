import { AccountInfo, InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, msalReady, API_SCOPE } from "./msal";
import { acquireTokenViaDialog } from "./dialogAuth";

const request = { scopes: [API_SCOPE] };

function activeAccount(): AccountInfo | null {
  const acc = msalInstance.getActiveAccount();
  if (acc) return acc;
  const all = msalInstance.getAllAccounts();
  return all.length ? all[0] : null;
}

export async function getApiAccessToken(): Promise<string> {
  await msalReady;

  const account = activeAccount();
  if (account) {
    try {
      const res = await msalInstance.acquireTokenSilent({ ...request, account });
      return res.accessToken;
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) throw e;
    }
  }
  return acquireTokenViaDialog();
}
