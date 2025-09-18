import { create } from "zustand";
import { ML_REDACT_SUBSCRIPTION_KEY, ML_REDACT_TENANT_ID } from "../../config";
import { normalizeAxiosError } from "../../shared/errors";
import { MLRedactApiClient } from "../api/mlRedactApiClient";
import { getRecipientsReliable } from "../utils/get-recipients";

// const apiClient = new MLRedactApiClient(ML_REDACT_SUBSCRIPTION_KEY, getApiAccessToken);
const apiClient = new MLRedactApiClient(ML_REDACT_SUBSCRIPTION_KEY);

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

const htmlToPlain = (html: string): string => {
  try {
    const div = document.createElement("div");
    div.innerHTML = (html || "").replace(/<br\s*\/?>/gi, "\n");
    return div.textContent || (div as any).innerText || "";
  } catch {
    return html || "";
  }
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
  setRedactionMethod: (val) => {
    try {
      Office?.context?.roamingSettings?.set("mlr_redaction_method", val);
      Office?.context?.roamingSettings?.saveAsync?.(() => {});
    } catch {}
    try {
      localStorage.setItem("mlr_redaction_method", val);
    } catch {}
    set({ redactionMethod: val });
  },
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
    const messageId = await new Promise<string>((resolve) =>
      Office.context.mailbox.item.saveAsync(() =>
        resolve((Office.context.mailbox.item as any).itemId || `msg-${Date.now()}`)
      )
    );
    const recipients = await getRecipientsReliable();
    const bodyHtml = await new Promise<string>((resolve) =>
      Office.context.mailbox.item.body.getAsync("html", (res) => resolve(String(res?.value ?? "")))
    );
    const now = new Date().toISOString();

    try {
      for (let i = 10; i <= 90; i += 20) {
        await new Promise((r) => setTimeout(r, 120));
        set({ progress: i });
      }

      // const token = await getApiAccessToken();
      // const tenantId = tenantIdFromJwt(token) || "T3";

      const response = await apiClient.processMessage({
        messageId,
        tenantId: ML_REDACT_TENANT_ID,
        utcTimestamp: now,
        triggerType: "manual",
        subject,
        body: bodyHtml || body,
        actionsRequested: [
          ...(proofread ? (["Proofread"] as const) : []),
          ...(redact ? (["Redact"] as const) : []),
        ],
        redactionMethod,
        userContext: prompts.join(", "),
        messageRecipients: recipients,
        messageSender: sender,
      });

      const updatedHtml = response.UpdatedBody || "";
      const updatedText = htmlToPlain(updatedHtml);
      set({
        subject,
        updatedSubject: response.UpdatedSubject,
        responseText: updatedText,
        responseHtml: updatedHtml,
        progress: 100,
        loading: false,
      });
    } catch (err: any) {
      const n = normalizeAxiosError(err, {
        defaultMsg: "Could not process your email right now.",
      });

      const url = `${err?.config?.baseURL || ""}${err?.config?.url || ""}`;
      const details = `Kind: ${n.code}${n.status ? `  Status: ${n.status}` : ""}${n.correlationId ? `  Correlation: ${n.correlationId}` : ""}
User Msg: ${n.userMessage}
Dev Msg: ${n.devMessage || "(none)"}
URL: ${url || "(unknown)"}
Axios: ${err?.message || "(no message)"}`;

      set({
        validationError: n.userMessage,
        responseError: details,
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
