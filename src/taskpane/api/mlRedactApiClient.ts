import axios, { AxiosHeaders, AxiosInstance } from "axios";

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
    this.axios = axios.create({
      baseURL: getApiBaseUrl(),
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    });
    // this.axios = axios.create({
    //   baseURL: getApiBaseUrl(),
    //   headers: { "Content-Type": "application/json" },
    // });

    this.axios.interceptors.request.use(async (config) => {
      const token = await this.tokenProvider();
      if (token) {
        if (!config.headers) {
          config.headers = new AxiosHeaders();
        }
        (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
      }
      return config;
    });
    // this.axios.interceptors.request.use(async (config) => {
    //   // make url absolute for better error text
    //   if (config.baseURL && config.url && !/^https?:\/\//i.test(config.url)) {
    //     config.url = new URL(config.url, config.baseURL).href;
    //   }
    //   const token = await this.tokenProvider();
    //   if (!config.headers) config.headers = new AxiosHeaders();
    //   if (token) (config.headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
    //   return config;
    // });
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
