import { create } from "zustand";
import { MLRedactApiClient } from "../api/mlRedactApiClient";
import { getRecipients } from "../utils/get-recipients";
import { getApiAccessToken } from "../../auth/getToken";
import { classifyAxiosError, decodeJwtPayload, quickCorsProbe } from "../utils/net-diagnostics";
import { tenantIdFromJwt } from "../../auth/claims";

const apiClient = new MLRedactApiClient("25f4389cf52441e0b16c6adc466c0c5b", getApiAccessToken);

const redactionOptions = ["Blackout", "<REDACTED>", "Partial mask"] as const;
type RedactionOption = (typeof redactionOptions)[number];

type EnhancementStore = {
  subject: string;
  updatedSubject: string;
  body: string;
  proofread: boolean;
  redact: boolean;
  redactionMethod: RedactionOption;
  prompts: string[];
  responseHtml: string;
  responseText: string;
  validationError: string | null;
  responseError: string | null;
  loading: boolean;
  progress: number;

  setBody: (val: string) => void;
  setProofread: (val: boolean) => void;
  setRedact: (val: boolean) => void;
  setRedactionMethod: (val: RedactionOption) => void;
  addPrompt: (val: string) => void;
  removePrompt: (index: number) => void;
  setResponseHtml: (html: string) => void;
  setResponseText: (text: string) => void;
  setProgress: (val: number) => void;
  handleRun: () => Promise<void>;
  reset: () => void;
};

export const useEnhancementStore = create<EnhancementStore>((set, get) => ({
  subject: "",
  updatedSubject: "",
  body: "",
  proofread: false,
  redact: false,
  redactionMethod: "Blackout",
  prompts: [],
  responseHtml: "",
  responseText: "",
  validationError: null,
  responseError: null,
  loading: false,
  progress: 0,

  setBody: (body) => set({ body }),
  setProofread: (val) => set({ proofread: val }),
  setRedact: (val) => set({ redact: val }),
  setRedactionMethod: (val) => set({ redactionMethod: val }),
  addPrompt: (val) => {
    const prompts = get().prompts;
    if (val && prompts.length < 5 && !prompts.includes(val)) {
      set({ prompts: [...prompts, val] });
    }
  },
  removePrompt: (index) => {
    const prompts = get().prompts;
    set({ prompts: prompts.filter((_, i) => i !== index) });
  },
  setResponseHtml: (html) => set({ responseHtml: html }),
  setResponseText: (text) => set({ responseText: text }),
  setProgress: (val) => set({ progress: val }),

  handleRun: async () => {
    set({
      loading: true,
      responseError: null,
      validationError: null,
      progress: 0,
    });

    const { proofread, redact, body, redactionMethod, prompts } = get();
    if (!proofread && !redact) {
      set({ validationError: "You need to choose at least one option.", loading: false });
      return;
    }

    const subject = await new Promise<string>((resolve) => {
      Office.context.mailbox.item.subject.getAsync((result) => {
        resolve(result.status === Office.AsyncResultStatus.Succeeded ? result.value : "No Subject");
      });
    });

    const sender = Office.context.mailbox.userProfile.emailAddress ?? "unknown@example.com";
    const recipients = await getRecipients();
    const now = new Date().toISOString();

    try {
      for (let i = 10; i <= 90; i += 20) {
        await new Promise((r) => setTimeout(r, 150));
        set({ progress: i });
      }

      const token = await getApiAccessToken();
      const tenantId = tenantIdFromJwt(token) || "T3";

      const response = await apiClient.processMessage({
        messageId: `msg-${Date.now()}`,
        tenantId: tenantId || "T3",
        // tenantId: "T3",
        utcTimestamp: now,
        triggerType: "manual",
        subject,
        body,
        actionsRequested: [
          ...(proofread ? (["Proofread"] as const) : []),
          ...(redact ? (["Redact"] as const) : []),
        ],
        redactionMethod,
        userContext: prompts.join(", "),
        messageRecipients: recipients,
        messageSender: sender,
      });

      set({
        subject,
        updatedSubject: response.UpdatedSubject,
        responseText: response.UpdatedBody,
        responseHtml: `<p>${response.UpdatedBody.replace(/\n/g, "<br>")}</p>`,
        progress: 100,
        loading: false,
      });
    } catch (err: any) {
      console.error("Error processing message:", err);

      // ✅ classify the error
      const classification = classifyAxiosError(err);

      // ✅ grab token + decode for helpful hints
      const authHeader: string | undefined =
        err?.config?.headers?.Authorization || err?.config?.headers?.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
      const jwt = decodeJwtPayload(token);
      const aud = jwt?.aud;
      const tid = jwt?.tid;
      const sub = jwt?.sub;

      // ✅ run a quick probe so you can SEE something even in desktop Outlook
      let probeText = "";
      try {
        const endpoint = new URL(err?.config?.url ?? "", err?.config?.baseURL ?? "").href;
        const probe = await quickCorsProbe(endpoint);
        probeText = `Probe from origin ${probe.origin}:\n- ${probe.notes.join("\n- ")}`;
      } catch {
        /* ignore */
      }

      let errorDetails = "";
      const tenantId = tenantIdFromJwt(await getApiAccessToken()) || "T3";

      if (err.response) {
        errorDetails = `
    Response Error
    Status: ${err.response.status} ${err.response.statusText}
    URL: ${err.config?.url || "N/A"}
    Method: ${err.config?.method || "N/A"}
    Request Headers: ${JSON.stringify(err.config?.headers || {}, null, 2)}
    Response Data: ${JSON.stringify(err.response.data, null, 2)}
    Classification: ${classification.kind} — ${classification.hint}
    JWT (aud): ${aud || "N/A"}
    JWT (tid): ${tid || "N/A"}
    JWT (sub): ${sub || "N/A"}
    ${probeText}
    Tenant ID: ${tenantId}
    `.trim();
      } else if (err.request) {
        errorDetails = `
    No Response Received
    URL: ${err.config?.url || "N/A"}
    Method: ${err.config?.method || "N/A"}
    Request Headers: ${JSON.stringify(err.config?.headers || {}, null, 2)}
    Message: ${err.message}
    Classification: ${classification.kind} — ${classification.hint}
    JWT (aud): ${aud || "N/A"}
    JWT (tid): ${tid || "N/A"}
    JWT (sub): ${sub || "N/A"}
    ${probeText}
    Tenant ID: ${tenantId}
    `.trim();
      } else {
        errorDetails = `
    Request Setup Error
    Message: ${err.message}
    Stack: ${err.stack || "N/A"}
    Classification: ${classification.kind} — ${classification.hint}
    ${probeText}
    Tenant ID: ${tenantId}
    `.trim();
      }

      set({ responseError: errorDetails, loading: false, progress: 0 });
    }
  },

  reset: () =>
    set({
      subject: "",
      updatedSubject: "",
      proofread: false,
      redact: false,
      prompts: [],
      responseHtml: "",
      responseText: "",
      responseError: null,
      validationError: null,
      progress: 0,
    }),
}));
