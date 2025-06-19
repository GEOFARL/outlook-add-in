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
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  promptContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  chip: {
    background: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusCircular,
    padding: "0.25rem 0.75rem",
  },
  runBtn: {
    backgroundColor: "#0F6CBD",
    fontWeight: 500,
    "&:hover": {
      backgroundColor: "#0C5BA9",
    },
    "&:active": {
      backgroundColor: "#094B8A !important",
    },
    "&:focus": {
      backgroundColor: "#094B8A !important",
    },
  },
  runBtnContent: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  dropdown: {
    backgroundColor: "#FAFCFF",
    border: `1px solid ${tokens.colorBrandStroke1}`,
    "&:hover": {
      border: "1px solid #0F6CBD",
    },
    "&:focus-within": {
      border: "1px solid #0F6CBD",
      boxShadow: `0 0 0 2px ${tokens.colorBrandBackground2}`,
    },
  },

  switch: {
    "--colorCompoundBrandBackground": "#0F6CBD",
    "--colorCompoundBrandBackgroundPressed": "#0F6CBD",
    "--colorTransparentStrokeInteractive": "#0F6CBD",
    "--colorCompoundBrandBackgroundHover": "#0F6CBD",
  },
});

export const EnhancementForm: React.FC = () => {
  const styles = useStyles();
  const {
    proofread,
    redact,
    redactionMethod,
    prompts,
    validationError: error,
    loading,
    setProofread,
    setRedact,
    setRedactionMethod,
    addPrompt,
    handleRun,
    removePrompt,
  } = useEnhancementStore();

  return (
    <>
      <div className={styles.section}>
        <Switch
          className={styles.switch}
          checked={proofread}
          onChange={() => setProofread(!proofread)}
          label="Proofread"
        />
        <Switch
          className={styles.switch}
          checked={redact}
          onChange={() => setRedact(!redact)}
          label="Redact"
        />
      </div>

      {redact && (
        <Field label="Redaction method">
          <Dropdown
            className={styles.dropdown}
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
              <button
                onClick={() => removePrompt(i)}
                style={{
                  marginLeft: "0.5rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  fontSize: "1rem",
                }}
                aria-label={`Remove ${p}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <PromptInput onAdd={addPrompt} disabled={prompts.length >= 5} />
      </Field>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <Button className={styles.runBtn} appearance="primary" onClick={handleRun} disabled={loading}>
        {loading ? (
          <Spinner />
        ) : (
          <span className={styles.runBtnContent}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.04541 5.50879C3.04548 5.15098 3.41018 4.9096 3.73975 5.04883L19.0825 11.5391C19.4894 11.7112 19.4894 12.2888 19.0825 12.4609L3.73975 18.9512C3.41018 19.0904 3.04548 18.849 3.04541 18.4912V14.665L3.05322 14.5752C3.09046 14.3711 3.25254 14.207 3.46338 14.1719L7.61865 13.4795C9.28943 13.2007 9.28942 10.7993 7.61865 10.5205L3.46338 9.82812C3.22237 9.78796 3.04554 9.57926 3.04541 9.33496V5.50879Z"
                stroke="#FAFCFF"
              />
            </svg>
            Run Enhancement
          </span>
        )}
      </Button>
    </>
  );
};
