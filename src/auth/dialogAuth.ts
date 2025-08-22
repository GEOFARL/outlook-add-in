const STORAGE_KEY = "mlr:aad_token";

let cached = { token: "", exp: 0 };
let seedOnce: Promise<void> | null = null;

function decodeExp(jwt: string): number {
  try {
    const [, p] = jwt.split(".");
    const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return Number(payload?.exp) || 0;
  } catch {
    return 0;
  }
}

async function ensureSeeded(): Promise<void> {
  if (seedOnce) return seedOnce;
  seedOnce = (async () => {
    if (cached.token) return;
    try {
      const t = await OfficeRuntime.storage.getItem(STORAGE_KEY);
      if (t) {
        cached = { token: t, exp: decodeExp(t) };
        return;
      }
    } catch {}
    try {
      const lt = localStorage.getItem(STORAGE_KEY);
      if (lt) {
        cached = { token: lt, exp: decodeExp(lt) };
        try {
          await OfficeRuntime.storage.setItem(STORAGE_KEY, lt);
        } catch {}
      }
    } catch {}
  })();
  return seedOnce;
}

export async function seedTokenFromOfficeStorage(): Promise<boolean> {
  await ensureSeeded();
  return !!cached.token;
}

export async function getCachedTokenAsync(): Promise<string | null> {
  await ensureSeeded();
  const now = Math.floor(Date.now() / 1000);
  return cached.token && cached.exp > now + 60 ? cached.token : null;
}

export async function setCachedToken(token: string): Promise<void> {
  cached = { token, exp: decodeExp(token) };
  try {
    await OfficeRuntime.storage.setItem(STORAGE_KEY, token);
  } catch {}
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {}
}

export async function acquireTokenViaDialog(): Promise<string> {
  const url = "https://remarkable-frangipane-cca096.netlify.app/auth.html?dialog=1";
  return new Promise<string>((resolve, reject) => {
    Office.context.ui.displayDialogAsync(
      url,
      { width: 40, height: 60, displayInIframe: false },
      (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded || !result.value) {
          return reject(new Error("Failed to open auth dialog"));
        }
        const dialog = result.value;
        let done = false;

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
          try {
            const msg = JSON.parse(arg.message || "{}");
            if (msg?.type === "aad-token" && typeof msg.token === "string") {
              done = true;
              try {
                dialog.messageChild(JSON.stringify({ type: "ack-close" }));
              } catch {}
              try {
                dialog.close();
              } catch {}
              resolve(msg.token);
            } else if (msg?.type === "aad-error") {
              try {
                dialog.close();
              } catch {}
              reject(new Error(msg.error || "AAD auth error"));
            }
          } catch (e) {
            try {
              dialog.close();
            } catch {}
            reject(e as Error);
          }
        });

        dialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          if (!done) reject(new Error("Dialog was closed before sign-in finished."));
        });
      }
    );
  });
}
