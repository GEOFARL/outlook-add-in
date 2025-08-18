import { PublicClientApplication } from "@azure/msal-browser";

export const TENANT_ID = "6f256e64-2cce-4cdc-a7cc-04ddf865e49b";
export const SPA_CLIENT_ID = "8b87e2e0-d49e-409f-ae49-8019b578223e";
export const REDIRECT_URI = "https://remarkable-frangipane-cca096.netlify.app/auth.html";
export const API_SCOPE = "api://5c615299-9fbe-4a17-af72-e84399759fc6/api.access";

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: SPA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: "https://remarkable-frangipane-cca096.netlify.app/auth.html",
    navigateToLoginRequestUrl: false,
  },
  cache: { cacheLocation: "localStorage", storeAuthStateInCookie: true },
  system: { allowRedirectInIframe: true },
});

export const msalReady = msalInstance.initialize();
