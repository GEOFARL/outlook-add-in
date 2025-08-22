import { AccountInfo } from "@azure/msal-browser";
import { getCachedTokenAsync, seedTokenFromOfficeStorage, setCachedToken } from "./dialogAuth";
import { API_SCOPE, msalInstance, msalReady } from "./msal";

const request = { scopes: [API_SCOPE] as string[] };

function activeAccount(): AccountInfo | null {
  return msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;
}

function jwtExpSeconds(jwt: string): number {
  try {
    const [, p] = jwt.split(".");
    const { exp } = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return Number(exp) || 0;
  } catch {
    return 0;
  }
}

export async function getApiAccessToken(): Promise<string> {
  await seedTokenFromOfficeStorage();

  const cached = await getCachedTokenAsync();
  const now = Math.floor(Date.now() / 1000);
  if (cached && jwtExpSeconds(cached) > now + 120) return cached;

  await msalReady;
  const acc = activeAccount();
  if (acc) {
    try {
      const res = await msalInstance.acquireTokenSilent({
        ...request,
        account: acc,
        forceRefresh: !cached || jwtExpSeconds(cached) <= now + 120,
      });
      await setCachedToken(res.accessToken);
      return res.accessToken;
    } catch {}
  }

  const { acquireTokenViaDialog } = await import("./dialogAuth");
  const t = await acquireTokenViaDialog();
  await setCachedToken(t);
  return t;
}
