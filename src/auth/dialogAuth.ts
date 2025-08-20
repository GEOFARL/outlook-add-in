import { DBG } from "./debug";

type Dialog = Office.Dialog;
const baseUrl = "https://remarkable-frangipane-cca096.netlify.app";

let cached = { token: "", exp: 0 };
let inflight: Promise<string> | null = null;

function decodeExp(jwt: string): number {
  try {
    const [, p] = jwt.split(".");
    const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return Number(payload?.exp) || 0;
  } catch {
    return 0;
  }
}
export function getCachedToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp > now + 60) return cached.token;
  return null;
}
export function setCachedToken(token: string) {
  cached = { token, exp: decodeExp(token) };
  DBG.log("Cached token; exp:", cached.exp);
}

export async function acquireTokenViaDialog(): Promise<string> {
  if (inflight) {
    DBG.log("Reusing in-flight auth promise");
    return inflight;
  }

  const url = `${baseUrl}/auth.html?dialog=1${DBG.on ? "&debug=1" : ""}`;
  DBG.log("Opening auth dialog:", url);

  inflight = new Promise<string>((resolve, reject) => {
    Office.context.ui.displayDialogAsync(
      url,
      { width: 40, height: 60, displayInIframe: false },
      (r) => {
        if (r.status !== Office.AsyncResultStatus.Succeeded || !r.value) {
          DBG.err("displayDialogAsync failed:", r.status);
          inflight = null;
          return reject(new Error("Failed to open auth dialog"));
        }
        const dialog = r.value as Dialog;
        DBG.log("Dialog opened");

        let gotToken = false;

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
          DBG.log("DialogMessageReceived raw:", arg?.message);
          try {
            const msg = JSON.parse(arg.message);
            if (msg?.type === "aad-token" && typeof msg.token === "string") {
              gotToken = true;
              DBG.log("Received token (len):", msg.token.length);
              setCachedToken(msg.token);

              try {
                dialog.messageChild(JSON.stringify({ type: "ack-close" }));
                DBG.log("ACK sent to child");
              } catch (e) {
                DBG.err("Failed to messageChild ACK:", e);
              }

              setTimeout(() => {
                try {
                  dialog.close();
                  DBG.log("Dialog.close() called");
                } catch (e) {
                  DBG.err("Dialog.close() error:", e);
                }
              }, 120);

              inflight = null;
              return resolve(msg.token as string);
            } else if (msg?.type === "aad-error") {
              DBG.err("Child reported AAD error:", msg.error);
              try {
                dialog.close();
              } catch {}
              inflight = null;
              return reject(new Error(msg.error ?? "AAD auth error"));
            } else {
              DBG.warn("Unknown message from child:", msg);
            }
          } catch (e) {
            DBG.err("Parsing child message failed:", e);
            try {
              dialog.close();
            } catch {}
            inflight = null;
            return reject(e);
          }
        });

        const watchdog = setInterval(() => {
          const t = getCachedToken();
          if (t) {
            DBG.log("Watchdog sees cached token; closing dialog");
            clearInterval(watchdog);
            try {
              dialog.close();
            } catch {}
            inflight = null;
            resolve(t);
          }
        }, 250);

        dialog.addEventHandler(Office.EventType.DialogEventReceived, (evt: any) => {
          clearInterval(watchdog);
          const code = typeof evt?.error === "number" ? evt.error : -1;
          DBG.err("DialogEventReceived:", code);
          if (!gotToken) {
            inflight = null;
            return reject(
              new Error(
                code === 12006
                  ? "Login dialog was closed before sign-in finished."
                  : `Dialog failed (code ${code})`
              )
            );
          }
        });
      }
    );
  });

  return inflight;
}
