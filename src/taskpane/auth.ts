import { msalInstance, msalReady, API_SCOPE } from "../auth/msal";

const isDialog = () =>
  window.location.search.includes("dialog=1") &&
  !!(window.Office && Office.context && Office.context.ui && Office.context.ui.messageParent);

async function run() {
  await msalReady;

  const result = await msalInstance.handleRedirectPromise();
  if (result?.account) msalInstance.setActiveAccount(result.account);

  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) {
    await msalInstance.loginRedirect({ scopes: [API_SCOPE] });
    return; // resumes here after redirect
  }

  const tokenResult = await msalInstance.acquireTokenSilent({ scopes: [API_SCOPE], account });
  const token = tokenResult.accessToken;

  if (isDialog()) {
    // ✅ Send token back to taskpane and STOP
    Office.context.ui.messageParent(JSON.stringify({ type: "aad-token", token }));
    return; // <-- IMPORTANT: do NOT navigate to taskpane inside the dialog
  }

  // Fallback for direct browser hits (not dialog)
  window.location.replace("/taskpane.html");
}

// Wait for Office to be ready in case we're inside a dialog
if (window.Office && Office.onReady) {
  Office.onReady().then(run);
} else {
  run();
}
