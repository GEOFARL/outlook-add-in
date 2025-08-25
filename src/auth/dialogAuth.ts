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

function isEventRuntime(): boolean {
  try {
    return /\/events\.html$/i.test(window.location.pathname || "");
  } catch {
    return false;
  }
}
function dialogHost(isDev: boolean) {
  return isDev ? "https://localhost:3000" : "https://remarkable-frangipane-cca096.netlify.app";
}
function isDevHost() {
  try {
    return /localhost:3000$/i.test(window.location.host || "");
  } catch {
    return false;
  }
}
function buildAuthUrl(base: string) {
  const origin = encodeURIComponent(window.location.origin);
  return `${base}/auth.html?dialog=1&origin=${origin}&v=${Date.now()}`;
}
function shouldDisplayInIframe(): boolean {
  try {
    const hn = (Office.context as any)?.mailbox?.diagnostics?.hostName || "";
    return /outlook/i.test(hn);
  } catch {
    return false;
  }
}
function dialogErrorToMessage(err: any): string {
  const code = err?.error?.code ?? err?.code;
  switch (code) {
    case 12004:
      return "Dialog domain not trusted (add to AppDomains).";
    case 12005:
      return "Dialog not supported in this context.";
    case 12007:
      return "Dialog must be HTTPS / cert not trusted.";
    default:
      return "Failed to open auth dialog";
  }
}

export async function acquireTokenViaDialog(): Promise<string> {
  if (isEventRuntime()) throw new Error("auth:dialog-not-allowed-in-event-runtime");

  const dev = isDevHost();
  const inIframe = shouldDisplayInIframe();

  const tryOpen = (url: string) =>
    new Promise<Office.Dialog>((resolve, reject) => {
      Office.context.ui.displayDialogAsync(
        url,
        { width: 40, height: 60, displayInIframe: inIframe },
        (res) => {
          if (res.status === Office.AsyncResultStatus.Succeeded && res.value) resolve(res.value);
          else reject(res);
        }
      );
    });

  let dialog: Office.Dialog | null = null;
  let lastErr: any = null;

  const localUrl = buildAuthUrl(dialogHost(true));
  const prodUrl = buildAuthUrl(dialogHost(false));

  try {
    dialog = await tryOpen(dev ? localUrl : prodUrl);
  } catch (e) {
    lastErr = e;
    const code = e?.error?.code ?? e?.code;
    const canFallback = dev && (code === 12007 || code === 12004 || code === 12005);
    if (canFallback) {
      dialog = await tryOpen(prodUrl);
    } else {
      throw new Error(dialogErrorToMessage(e));
    }
  }

  return new Promise<string>((resolve, reject) => {
    let done = false;

    dialog!.addEventHandler(Office.EventType.DialogMessageReceived, async (arg: any) => {
      try {
        const msg = JSON.parse(arg?.message || "{}");
        if (msg?.type === "aad-token" && typeof msg.token === "string") {
          done = true;
          try {
            await setCachedToken(msg.token);
          } catch {}
          try {
            dialog!.messageChild(JSON.stringify({ type: "ack-close" }));
          } catch {}
          try {
            dialog!.close();
          } catch {}
          return resolve(msg.token);
        }
        if (msg?.type === "aad-error") {
          try {
            dialog!.close();
          } catch {}
          return reject(new Error(msg.error || "AAD auth error"));
        }
      } catch (e) {
        try {
          dialog!.close();
        } catch {}
        return reject(e as Error);
      }
    });

    dialog!.addEventHandler(Office.EventType.DialogEventReceived, () => {
      if (!done) reject(new Error("Dialog was closed before sign-in finished."));
    });
  });
}
