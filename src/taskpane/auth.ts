import { msalInstance, msalReady } from "../auth/msal";

(async () => {
  await msalReady;
  const result = await msalInstance.handleRedirectPromise();
  if (result?.account) {
    msalInstance.setActiveAccount(result.account);
  }
  window.location.replace("/taskpane.html");
})();
