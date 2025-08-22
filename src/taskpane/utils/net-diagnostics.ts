export function decodeJwtPayload(token?: string): any | null {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export async function quickCorsProbe(url: string) {
  const origin = window.location.origin;
  const notes: string[] = [];

  try {
    const r = await fetch(url, { method: "GET", mode: "cors" });
    notes.push(`GET ${url} -> ${r.status}`);
  } catch (e: any) {
    notes.push(`GET ${url} failed: ${e?.message ?? e}`);
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: "probe",
    });
    notes.push(`POST(text/plain) ${url} -> ${r.status}`);
  } catch (e: any) {
    notes.push(`POST(text/plain) ${url} failed: ${e?.message ?? e}`);
  }

  return { origin, notes };
}

export function classifyAxiosError(err: any) {
  const cfg = err?.config ?? {};
  const hdr = (cfg.headers ?? {}) as Record<string, string>;
  const hasAuth = !!Object.keys(hdr).find((k) => k.toLowerCase() === "authorization");
  const hasIdem = !!Object.keys(hdr).find((k) => k.toLowerCase() === "idempotency-key");

  if (err?.response) {
    return { kind: "http", status: err.response.status, hint: "Server responded with error." };
  }
  if (err?.request && err?.message?.toLowerCase().includes("network error")) {
    if (hasAuth || hasIdem) {
      return {
        kind: "preflight",
        hint:
          "Likely CORS preflight blocked. Allow this origin and request headers at APIM: " +
          "authorization, content-type, ocp-apim-subscription-key, idempotency-key; methods: OPTIONS, POST.",
      };
    }
    return { kind: "network", hint: "Network/connectivity issue." };
  }
  return { kind: "setup", hint: "Request setup error (check code/URL/config)." };
}
