import { msalInstance, msalReady, API_SCOPE } from "../auth/msal";

const inDialog = () =>
  window.location.search.includes("dialog=1") &&
  !!(window.Office && Office.context?.ui?.messageParent);

function installAckHandler() {
  if (!inDialog()) return;
  Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, (evt) => {
    try {
      const msg = JSON.parse(evt.message || "{}");
      if (msg?.type === "ack-close") {
        if (Office.context.ui.closeContainer) Office.context.ui.closeContainer();
        else window.close();
      }
    } catch {}
  });
}

function sendOnAllChannels(token) {
  try {
    Office.context.ui.messageParent(JSON.stringify({ type: "aad-token", token }));
  } catch {}

  try {
    const bc = new BroadcastChannel("aad-auth");
    bc.postMessage({ type: "aad-token", token });
    setTimeout(() => bc.close(), 200);
  } catch {}

  try {
    localStorage.setItem("aad_token_drop", JSON.stringify({ token, ts: Date.now() }));
  } catch {}
}

async function sendTokenAndExit(token) {
  if (inDialog()) {
    sendOnAllChannels(token);
    return;
  }
  window.location.replace("/taskpane.html");
}

async function run() {
  await msalReady;

  const res = await msalInstance.handleRedirectPromise();
  if (res?.account) msalInstance.setActiveAccount(res.account);

  let account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) {
    await msalInstance.loginRedirect({ scopes: [API_SCOPE], prompt: "select_account" });
    return;
  }

  installAckHandler();

  const tokenRes = await msalInstance.acquireTokenSilent({ scopes: [API_SCOPE], account });
  await sendTokenAndExit(tokenRes.accessToken);
}

if (window.Office && Office.onReady) Office.onReady().then(run);
else run();
