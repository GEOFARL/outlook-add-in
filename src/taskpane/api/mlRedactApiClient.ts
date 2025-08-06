import axios, { AxiosInstance } from "axios";

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
  messageRecipients: {
    to: string[];
    cc: string[];
    bcc: string[];
  };
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
  if (process.env.NODE_ENV === "development") {
    return "https://localhost:4000/dev-api";
  }
  return "https://mlredact-apim.azure-api.net";
}

export class MLRedactApiClient {
  private axios: AxiosInstance;

  constructor(subscriptionKey: string, bearerToken: string) {
    this.axios = axios.create({
      baseURL: getApiBaseUrl(),
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        Authorization: `Bearer ${bearerToken}`,
      },
    });
  }

  async processMessage(request: MLRedactRequest): Promise<MLRedactResponse> {
    const idempotencyKey = `${request.messageId}-${Date.now()}`;
    const response = await this.axios.post<MLRedactResponse>(
      `function-mlredact/ProcessEmail`,
      request,
      {
        headers: { "Idempotency-Key": idempotencyKey },
      }
    );
    return response.data;
  }
}
