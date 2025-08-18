import { msalReady } from "./msal";

type Dialog = Office.Dialog;

function getBaseUrl() {
  return "https://remarkable-frangipane-cca096.netlify.app";
}

export async function acquireTokenViaDialog(): Promise<string> {
  await msalReady;

  const dialogUrl = `${getBaseUrl()}/auth.html?dialog=1`;
  const options: Office.DialogOptions = {
    width: 40,
    height: 60,
    displayInIframe: true,
  };

  return new Promise((resolve, reject) => {
    Office.context.ui.displayDialogAsync(dialogUrl, options, (asyncResult) => {
      if (asyncResult.status !== Office.AsyncResultStatus.Succeeded || !asyncResult.value) {
        return reject(new Error("Failed to open auth dialog"));
      }

      const dialog = asyncResult.value as Dialog;

      dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
        try {
          const payload = JSON.parse(arg.message);
          if (payload?.type === "aad-token" && payload?.token) {
            dialog.close();
            resolve(payload.token);
            return;
          }
          if (payload?.type === "aad-error") {
            dialog.close();
            reject(new Error(payload.error ?? "AAD auth error"));
          }
        } catch {}
      });

      dialog.addEventHandler(Office.EventType.DialogEventReceived, (evt: any) => {
        const code = typeof evt?.error === "number" ? evt.error : -1;
        reject(new Error(`Dialog closed or failed (code ${code})`));
      });
    });
  });
}
