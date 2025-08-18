import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  AccountInfo,
} from "@azure/msal-browser";

const TENANT_ID = "6f256e64-2cce-4cdc-a7cc-04ddf865e49b";
const SPA_CLIENT_ID = "0a30dd22-11ef-43ec-bf55-9e46ed2b4176";
const REDIRECT_URI = "https://remarkable-frangipane-cca096.netlify.app/auth.html";
const API_SCOPE = "api://5c615299-9fbe-4a17-af72-e84399759fc6/api.access";

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: SPA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: REDIRECT_URI,
  },
  cache: { cacheLocation: "localStorage" },
});

export const msalReady = msalInstance.initialize();

const request = { scopes: [API_SCOPE] };

function getActiveAccount(): AccountInfo | null {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length ? accounts[0] : null;
}

export async function getApiAccessToken(): Promise<string> {
  await msalReady;

  const account = getActiveAccount();
  if (!account) {
    await msalInstance.loginRedirect(request);
    return "";
  }

  try {
    const res = await msalInstance.acquireTokenSilent({ ...request, account });
    return res.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect(request);
      return "";
    }
    throw e;
  }
}
