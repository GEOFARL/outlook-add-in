import { create } from "zustand";
import { ML_REDACT_BEARER_TOKEN, ML_REDACT_SUBSCRIPTION_KEY } from "../../config";
import { MLRedactApiClient } from "../api/mlRedactApiClient";

const apiClient = new MLRedactApiClient(ML_REDACT_SUBSCRIPTION_KEY, ML_REDACT_BEARER_TOKEN);

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
    set({ subject });

    try {
      for (let i = 10; i <= 90; i += 20) {
        await new Promise((r) => setTimeout(r, 150));
        set({ progress: i });
      }

      const response = await apiClient.processMessage({
        messageId: `msg-${Date.now()}`,
        tenantId: "T1",
        subject,
        body,
        actionsRequested: [...(proofread ? ["proofread"] : []), ...(redact ? ["redact"] : [])],
        redactionMethod,
        userContext: prompts.join(", "),
      });

      set({
        updatedSubject: response.updatedSubject,
        responseText: response.updatedBody,
        responseHtml: `<p>${response.updatedBody}</p>`,
        progress: 100,
        loading: false,
      });
    } catch (err: any) {
      console.error("Error processing message:", err);
      let errorDetails = "Failed to process message.";

      if (err.response) {
        errorDetails = `
          Response Error:
          Status: ${err.response.status} ${err.response.statusText}
          URL: ${err.config?.url || "N/A"}
          Method: ${err.config?.method || "N/A"}
          Headers: ${JSON.stringify(err.config?.headers || {}, null, 2)}
          Response Data: ${JSON.stringify(err.response.data, null, 2)}
        `;
      } else if (err.request) {
        errorDetails = `
          No Response Received:
          URL: ${err.config?.url || "N/A"}
          Method: ${err.config?.method || "N/A"}
          Headers: ${JSON.stringify(err.config?.headers || {}, null, 2)}
          Message: ${err.message}
        `;
      } else {
        errorDetails = `
          Request Setup Error:
          Message: ${err.message}
          Stack: ${err.stack || "N/A"}
        `;
      }

      set({
        responseError: errorDetails.trim(),
        loading: false,
        progress: 0,
      });
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
