import type { AxiosError } from "axios";

export type NormalizedError = {
  code: "auth" | "policy" | "rate-limit" | "timeout" | "network" | "server" | "client" | "unknown";
  status?: number;
  correlationId?: string;
  userMessage: string;
  devMessage?: string;
};

export function normalizeAxiosError(err: any, opts?: { defaultMsg?: string }): NormalizedError {
  const defaultMsg =
    opts?.defaultMsg ?? "ML-Redact temporarily unavailable. Review before sending?";
  const ax: AxiosError | undefined = err?.isAxiosError ? err : undefined;
  const status = ax?.response?.status ?? 0;
  const data = (ax?.response?.data ?? "") as any;
  const text = typeof data === "string" ? data : data?.message || "";
  const url = ax?.config ? (ax.config.baseURL || "") + (ax.config.url || "") : undefined;
  const looksUnauthorized400 =
    status === 400 && typeof data === "string" && data.toLowerCase().includes("unauthorized");
  const isTimeout = ax?.code === "ECONNABORTED";

  const correlationId =
    (ax?.response?.headers as any)?.["x-correlation-id"] ||
    (ax?.response?.headers as any)?.["request-id"] ||
    (ax?.response?.headers as any)?.["request-context"];

  if (status === 401 || looksUnauthorized400) {
    return {
      code: "auth",
      status,
      correlationId,
      userMessage: "Please sign in to ML-Redact before sending.",
      devMessage: `Auth failed (${status}) at ${url} — body: ${String(text).slice(0, 200)}`,
    };
  }
  if (status === 429) {
    return {
      code: "rate-limit",
      status,
      correlationId,
      userMessage: "ML-Redact is busy. Please try again in a moment.",
      devMessage: `Rate limited at ${url}`,
    };
  }
  if (status >= 500) {
    return {
      code: "server",
      status,
      correlationId,
      userMessage: defaultMsg,
      devMessage: `Server error ${status} at ${url} — body: ${String(text).slice(0, 200)}`,
    };
  }
  if (isTimeout) {
    return {
      code: "timeout",
      status,
      correlationId,
      userMessage: "ML-Redact took too long to respond. Please try again.",
      devMessage: `Timeout calling ${url}`,
    };
  }
  if (!ax && err?.message === "Failed to fetch") {
    return {
      code: "network",
      userMessage: "Network problem reaching ML-Redact. Check your connection.",
      devMessage: "Fetch/network error",
    };
  }
  if (status >= 400 && status < 500) {
    return {
      code: "client",
      status,
      correlationId,
      userMessage: defaultMsg,
      devMessage: `Client error ${status} at ${url} — body: ${String(text).slice(0, 200)}`,
    };
  }
  return {
    code: "unknown",
    status,
    correlationId,
    userMessage: defaultMsg,
    devMessage: String(err?.message || err),
  };
}
