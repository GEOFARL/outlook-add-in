import fetch from "node-fetch";

const APIM_BASE = "https://mlredact-apim.azure-api.net";
const SUBSCRIPTION_KEY = "25f4389cf52441e0b16c6adc466c0c5b";
const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://remarkable-frangipane-cca096.netlify.app";

function cors(o?: string) {
  const origin = o && o.startsWith("http") ? o : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key",
    "Access-Control-Max-Age": "86400",
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors(event.headers.origin), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors(event.headers.origin), body: "Method Not Allowed" };
  }

  try {
    const auth = event.headers.authorization || event.headers.Authorization || "";
    const idem = event.headers["idempotency-key"] || event.headers["Idempotency-Key"] || "";

    const resp = await fetch(`${APIM_BASE}/function-mlredact/ProcessEmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
        ...(auth ? { Authorization: auth } : {}),
        ...(idem ? { "Idempotency-Key": idem as string } : {}),
      },
      body: event.body,
    });

    const text = await resp.text();
    return {
      statusCode: resp.status,
      headers: {
        ...cors(event.headers.origin),
        "Content-Type": resp.headers.get("content-type") || "application/json",
      },
      body: text,
    };
  } catch (e: any) {
    return {
      statusCode: 502,
      headers: cors(event.headers.origin),
      body: JSON.stringify({ error: "Upstream error", detail: String(e) }),
    };
  }
};
