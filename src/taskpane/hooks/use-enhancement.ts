import { useState } from "react";

const redactionOptions = ["Blackout", "<REDACTED>", "Partial mask"];

export function useEnhancement(body: string) {
  const [loading, setLoading] = useState(false);
  const [proofread, setProofread] = useState(false);
  const [redact, setRedact] = useState(false);
  const [redactionMethod, setRedactionMethod] = useState(redactionOptions[0]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!proofread && !redact) {
      setError("You need to choose at least one option.");
      return;
    }

    setLoading(true);
    setError(null);

    await new Promise((r) => setTimeout(r, 1500));

    const result = `
      <p><strong>${redact ? "[REDACTED]" : ""}</strong> Cleaned email version:</p>
      <blockquote>${body}</blockquote>
      <ul>
        ${proofread ? "<li>Checked grammar</li>" : ""}
        ${redact ? `<li>Masked sensitive info using ${redactionMethod}</li>` : ""}
      </ul>
    `;

    setResponse(result);

    Office.context.mailbox.item.body.setAsync(result, {
      coercionType: "html",
    });

    setLoading(false);
  };

  const addPrompt = (text: string) => {
    if (text && prompts.length < 5 && !prompts.includes(text)) {
      setPrompts((prev) => [...prev, text]);
    }
  };

  return {
    loading,
    proofread,
    redact,
    redactionMethod,
    prompts,
    response,
    error,
    setProofread,
    setRedact,
    setRedactionMethod,
    addPrompt,
    handleRun,
  };
}
