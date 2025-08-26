import axios, { AxiosError, AxiosHeaders, AxiosInstance } from "axios";
import { API_SCOPE } from "../../auth/msal";

export type MLRedactRequest = {
  messageId: string;
  tenantId: string;
  subject: string;
  body: string;
  utcTimestamp: string;
  triggerType: "onSend" | "manual";
  actionsRequested: ("Proofread" | "Redact")[];
  redactionMethod: string;
  userContext?: string;
  messageRecipients: { to: string[]; cc: string[]; bcc: string[] };
  messageSender: string;
};

export type MLRedactResponse = {
  MessageId: string;
  TenantId: string;
  UpdatedSubject: string;
  UpdatedBody: string;
  ReqConfirm: boolean;
};

function getApiBaseUrl() {
  const explicit =
    (typeof window !== "undefined" && (window as any).__API_BASE_URL__) ||
    (typeof process !== "undefined" && process.env && process.env.API_BASE_URL);
  if (explicit) return explicit;

  const hostIsDev =
    typeof window !== "undefined" &&
    typeof window.location?.host === "string" &&
    /localhost:3000$/i.test(window.location.host);

  const nodeEnv =
    (typeof process !== "undefined" && process.env && process.env.NODE_ENV) || "production";
  const isDev = nodeEnv === "development" || hostIsDev;

  return isDev
    ? "https://localhost:4000/dev-api/function-mlredact"
    : "https://mlredact-apim.azure-api.net/function-mlredact";
}

const RETRYABLE_STATUS = new Set([429, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MLRedactApiClient {
  private http: AxiosInstance;

  constructor(
    subscriptionKey: string
    // private tokenProvider: () => Promise<string>
  ) {
    this.http = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 45000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
      withCredentials: false,
    });

    // this.http.interceptors.request.use(async (config) => {
    //   const token = await this.tokenProvider();
    //   config.headers = config.headers || new AxiosHeaders();
    //   (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
    //   return config;
    // });

    this.http.interceptors.response.use(
      (r) => r,
      async (error: AxiosError & { config: any }) => {
        const cfg = error.config || {};
        const status = error?.response?.status ?? 0;
        const body = (error?.response?.data ?? "") as string;

        const looksUnauthorized400 =
          status === 400 && typeof body === "string" && body.toLowerCase().includes("unauthorized");

        if ((status === 401 || looksUnauthorized400) && !cfg.__retriedAuth) {
          cfg.__retriedAuth = true;
          try {
            const { msalInstance } = await import("../../auth/msal");
            const { setCachedToken } = await import("../../auth/dialogAuth");
            const acc = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
            if (!acc) throw new Error("No account for silent refresh");
            const res = await msalInstance.acquireTokenSilent({
              scopes: [API_SCOPE],
              account: acc,
              forceRefresh: true,
            });
            setCachedToken(res.accessToken);
            cfg.headers = cfg.headers || new AxiosHeaders();
            (cfg.headers as AxiosHeaders).set("Authorization", `Bearer ${res.accessToken}`);
            return this.http.request(cfg);
          } catch {}
        }

        const isTimeout = error.code === "ECONNABORTED";
        const isRetriable = isTimeout || RETRYABLE_STATUS.has(status);
        if (isRetriable && (cfg.__retryCount || 0) < 1) {
          cfg.__retryCount = (cfg.__retryCount || 0) + 1;
          await sleep(1200);
          return this.http.request(cfg);
        }

        throw error;
      }
    );
  }

  async processMessage(request: MLRedactRequest): Promise<MLRedactResponse> {
    const idempotencyKey =
      (request as any).idempotencyKey || `msg-${request.messageId}-${Date.now()}`;
    const res = await this.http.post<MLRedactResponse>("/ProcessEmail", request, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return res.data;
  }
}
