import { useState } from "react";

const redactionOptions = ["Blackout", "<REDACTED>", "Partial mask"];

export function useEnhancement(body: string) {
  const [loading, setLoading] = useState(false);
  const [proofread, setProofread] = useState(false);
  const [redact, setRedact] = useState(false);
  const [redactionMethod, setRedactionMethod] = useState(redactionOptions[0]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [responseHtml, setResponseHtml] = useState("");
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!proofread && !redact) {
      setError("You need to choose at least one option.");
      return;
    }

    setLoading(true);
    setError(null);

    await new Promise((r) => setTimeout(r, 1500));

    const enhancedText = body
      .replace("hissfdtory", "history")
      .replace("converfnmsation", "conversation");

    setResponseText(enhancedText);
    setResponseHtml("");

    setLoading(false);
  };

  const addPrompt = (text: string) => {
    if (text && prompts.length < 5 && !prompts.includes(text)) {
      setPrompts((prev) => [...prev, text]);
    }
  };

  const reset = () => {
    setProofread(false);
    setRedact(false);
    setPrompts([]);
    setResponseText("");
    setResponseHtml("");
    setError(null);
  };

  return {
    loading,
    proofread,
    redact,
    redactionMethod,
    prompts,
    responseHtml,
    responseText,
    error,
    setProofread,
    setRedact,
    setRedactionMethod,
    addPrompt,
    handleRun,
    reset,
    setResponseHtml,
  };
}
