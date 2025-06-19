"use client";

import {
  Button,
  Dropdown,
  Field,
  Option,
  Spinner,
  Switch,
  Textarea,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import React from "react";
import PromptInput from "./PromptInput";
import { useEnhancementStore } from "../stores/enhancement-store";

const useStyles = makeStyles({
  section: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  promptContainer: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
  chip: {
    background: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusCircular,
    padding: "0.25rem 0.75rem",
  },
});

export const EnhancementForm: React.FC = () => {
  const styles = useStyles();
  const {
    body,
    proofread,
    redact,
    redactionMethod,
    prompts,
    error,
    loading,
    setProofread,
    setRedact,
    setRedactionMethod,
    addPrompt,
    handleRun,
  } = useEnhancementStore();

  return (
    <>
      <div className={styles.section}>
        <Switch checked={proofread} onChange={() => setProofread(!proofread)} label="Proofread" />
        <Switch checked={redact} onChange={() => setRedact(!redact)} label="Redact" />
      </div>

      {redact && (
        <Field label="Redaction method">
          <Dropdown
            value={redactionMethod}
            onOptionSelect={(_, data) => setRedactionMethod(data.optionText as any)}
          >
            {["Blackout", "<REDACTED>", "Partial mask"].map((opt) => (
              <Option key={opt}>{opt}</Option>
            ))}
          </Dropdown>
        </Field>
      )}

      <Field label="Add instructions">
        <div className={styles.promptContainer}>
          {prompts.map((p, i) => (
            <div key={i} className={styles.chip}>
              {p}
            </div>
          ))}
        </div>
        <PromptInput onAdd={addPrompt} disabled={prompts.length >= 5} />
      </Field>

      <Field label="Email preview">
        <Textarea readOnly rows={6} value={body} resize="vertical" />
      </Field>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <Button appearance="primary" onClick={handleRun} disabled={loading}>
        {loading ? <Spinner /> : "Run Enhancement"}
      </Button>
    </>
  );
};
