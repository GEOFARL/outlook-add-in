import { create } from "zustand";

const redactionOptions = ["Blackout", "<REDACTED>", "Partial mask"] as const;
type RedactionOption = (typeof redactionOptions)[number];

type EnhancementStore = {
  body: string;
  proofread: boolean;
  redact: boolean;
  redactionMethod: RedactionOption;
  prompts: string[];
  responseHtml: string;
  responseText: string;
  error: string | null;
  loading: boolean;

  setBody: (val: string) => void;
  setProofread: (val: boolean) => void;
  setRedact: (val: boolean) => void;
  setRedactionMethod: (val: RedactionOption) => void;
  addPrompt: (val: string) => void;
  handleRun: () => Promise<void>;
  reset: () => void;
  setResponseHtml: (html: string) => void;
};

export const useEnhancementStore = create<EnhancementStore>((set, get) => ({
  body: "",
  proofread: false,
  redact: false,
  redactionMethod: "Blackout",
  prompts: [],
  responseHtml: "",
  responseText: "",
  error: null,
  loading: false,

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

  handleRun: async () => {
    const { proofread, redact, body } = get();

    if (!proofread && !redact) {
      set({ error: "You need to choose at least one option." });
      return;
    }

    set({ loading: true, error: null });

    await new Promise((r) => setTimeout(r, 1500));

    const enhancedText = body
      .replace("hissfdtory", "history")
      .replace("converfnmsation", "conversation");

    set({
      responseText: enhancedText,
      responseHtml: "",
      loading: false,
    });
  },

  reset: () =>
    set({
      proofread: false,
      redact: false,
      prompts: [],
      responseHtml: "",
      responseText: "",
      error: null,
    }),

  setResponseHtml: (html) => set({ responseHtml: html }),
}));
