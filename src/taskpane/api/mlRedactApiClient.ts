import axios, { AxiosHeaders, AxiosInstance } from "axios";
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
  // if (process.env.NODE_ENV === "development") {
  //   return "https://localhost:4000/dev-api";
  // }
  return "https://mlredact-apim.azure-api.net";
  // return "/.netlify/functions";
}

export class MLRedactApiClient {
  private axios: AxiosInstance;

  constructor(
    subscriptionKey: string,
    private tokenProvider: () => Promise<string>
  ) {
    // features/api/mlRedactApiClient.ts (constructor)
    this.axios = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 2500,
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    });

    // attach bearer from provider
    this.axios.interceptors.request.use(async (config) => {
      const token = await this.tokenProvider();
      config.headers = config.headers || new AxiosHeaders();
      (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
      return config;
    });

    // retry once on 401 with **silent** refresh only
    this.axios.interceptors.response.use(undefined, async (error) => {
      if (error?.response?.status === 401 && !error.config.__retried401) {
        error.config.__retried401 = true;
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
          setCachedToken(res.accessToken); // keep memory cache hot
          error.config.headers = error.config.headers || new AxiosHeaders();
          (error.config.headers as AxiosHeaders).set("Authorization", `Bearer ${res.accessToken}`);
          return this.axios.request(error.config);
        } catch (e) {
        }
      }
      throw error;
    });
  }

  async processMessage(request: MLRedactRequest): Promise<MLRedactResponse> {
    const idempotencyKey = `${request.messageId}-${Date.now()}`;
    const res = await this.axios.post<MLRedactResponse>("function-mlredact/ProcessEmail", request, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return res.data;
  }
  // async processMessage(body: any) {
  //   const idem = `msg-${Date.now()}`;
  //   return (
  //     await this.axios.post("/process-email", body, {
  //       headers: { "Idempotency-Key": idem },
  //     })
  //   ).data;
  // }
}
