import axios, { AxiosInstance } from "axios";

export type MLRedactRequest = {
  messageId: string;
  tenantId: string;
  subject: string;
  body: string;
  actionsRequested: string[];
  redactionMethod: string;
  userContext?: string;
};

export type MLRedactResponse = {
  messageId: string;
  tenantId: string;
  updatedSubject: string;
  updatedBody: string;
  reqConfirm: boolean;
};

function getApiBaseUrl() {
  if (process.env.NODE_ENV === "development") {
    return "https://localhost:4000/dev-api";
  }
  return "https://mlredactapidev-aafrfrbxetdmc9f5.southafricanorth-01.azurewebsites.net";
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
    const response = await this.axios.post<MLRedactResponse>(`/v1/messages`, request, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return response.data;
  }
}
