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
import DiffViewer from "./DiffViewer";

const useStyles = makeStyles({
  section: { display: "flex", flexDirection: "column", gap: "0.5rem" },
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
  resultBox: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: "0.5rem",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    whiteSpace: "pre-wrap",
  },
});

type Props = {
  body: string;
  proofread: boolean;
  redact: boolean;
  redactionMethod: string;
  prompts: string[];
  responseHtml: string;
  responseText: string;
  error: string | null;
  loading: boolean;
  setProofread: (val: boolean) => void;
  setRedact: (val: boolean) => void;
  setRedactionMethod: (val: string) => void;
  addPrompt: (val: string) => void;
  handleRun: () => void;
  onEditManually?: () => void;
  onReject?: () => void;
  onConfirm?: () => void;
};

export const EnhancementForm: React.FC<Props> = (props) => {
  const styles = useStyles();

  return (
    <>
      <div className={styles.section}>
        <Switch
          checked={props.proofread}
          onChange={() => props.setProofread(!props.proofread)}
          label="Proofread"
        />
        <Switch
          checked={props.redact}
          onChange={() => props.setRedact(!props.redact)}
          label="Redact"
        />
      </div>

      {props.redact && (
        <Field label="Redaction method">
          <Dropdown
            value={props.redactionMethod}
            onOptionSelect={(_, data) => props.setRedactionMethod(data.optionText || "")}
          >
            {["Blackout", "<REDACTED>", "Partial mask"].map((opt) => (
              <Option key={opt}>{opt}</Option>
            ))}
          </Dropdown>
        </Field>
      )}

      <Field label="Add instructions">
        <div className={styles.promptContainer}>
          {props.prompts.map((p, i) => (
            <div key={i} className={styles.chip}>
              {p}
            </div>
          ))}
        </div>
        <PromptInput onAdd={props.addPrompt} disabled={props.prompts.length >= 5} />
      </Field>

      <Field label="Email preview">
        <Textarea readOnly rows={6} value={props.body} resize="vertical" />
      </Field>

      {props.error && <div style={{ color: "red" }}>{props.error}</div>}

      <Button
        appearance="primary"
        onClick={props.handleRun}
        disabled={props.loading}
        style={{ alignSelf: "flex-start" }}
      >
        {props.loading ? <Spinner /> : "Run Enhancement"}
      </Button>

      {props.responseText && (
        <DiffViewer
          original={props.body}
          changed={props.responseText}
          onEdit={props.onEditManually}
          onReject={props.onReject}
          onConfirm={props.onConfirm}
        />
      )}

      {props.responseHtml && (
        <div className={styles.section}>
          <span>Processed Result:</span>
          <div
            className={styles.resultBox}
            dangerouslySetInnerHTML={{ __html: props.responseHtml }}
          />
        </div>
      )}
    </>
  );
};

function stripHtmlTags(html: string): string {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
