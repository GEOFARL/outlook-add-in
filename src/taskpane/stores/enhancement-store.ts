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
  validationError: string | null;
  responseError: string | null;
  loading: boolean;
  progress: number;

  setProgress: (val: number) => void;
  setBody: (val: string) => void;
  setProofread: (val: boolean) => void;
  setRedact: (val: boolean) => void;
  setRedactionMethod: (val: RedactionOption) => void;
  addPrompt: (val: string) => void;
  handleRun: () => Promise<void>;
  reset: () => void;
  setResponseHtml: (html: string) => void;
  removePrompt: (index: number) => void;
};

export const useEnhancementStore = create<EnhancementStore>((set, get) => ({
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

  setProgress: (val) => set({ progress: val }),
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

  handleRun: async () => {
    set({ responseError: null, responseText: "", responseHtml: "" });
    const { proofread, redact, body } = get();

    if (!proofread && !redact) {
      set({ validationError: "You need to choose at least one option." });
      return;
    }

    set({ loading: true, validationError: null });

    for (let i = 1; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 100));
      set({ progress: i });
    }
    await new Promise((r) => setTimeout(r, 500));
    const isError = Math.random() < 0.5;

    if (isError) {
      set({
        responseError: "AI failed to process this request.",
        loading: false,
      });
      return;
    }

    const enhancedText = body
      .replace("hissfdtory", "history")
      .replace("converfnmsation", "conversation");

    set({      responseText: enhancedText,
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
      responseError: null,
      validationError: null,
    }),

  setResponseHtml: (html) => set({ responseHtml: html }),
}));
