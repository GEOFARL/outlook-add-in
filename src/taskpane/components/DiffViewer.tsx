"use client";

import React from "react";
import { diffWords } from "diff";
import { Button, makeStyles } from "@fluentui/react-components";
import { useEnhancementStore } from "../stores/enhancement-store";

type Props = {
  onReject?: () => void;
  onConfirm?: () => void;
};

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    marginTop: "1rem",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontWeight: 600,
  },
  box: {
    backgroundColor: "#f9fafb",
    borderRadius: "4px",
    padding: "1rem",
    whiteSpace: "pre-wrap",
  },
  originalBox: {
    border: "2px dashed #3b82f6",
  },
  changedBox: {
    border: "1px solid #e5e7eb",
  },
  removedText: {
    backgroundColor: "#fdecea",
    color: "#d92d20",
  },
  addedText: {
    backgroundColor: "#ecfdf3",
    color: "#027a48",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
});

const DiffViewer: React.FC<Props> = ({ onReject, onConfirm }) => {
  const styles = useStyles();
  const {
    body: originalBody,
    responseText: changedBody,
    subject,
    updatedSubject,
  } = useEnhancementStore();

  const subjectDiff = diffWords(subject || "", updatedSubject || "");
  const bodyDiff = diffWords(originalBody || "", changedBody || "");

  const renderOriginal = (diffArr: ReturnType<typeof diffWords>) =>
    diffArr.map((part, i) =>
      part.added ? null : (
        <span key={i} className={part.removed ? styles.removedText : undefined}>
          {part.value}
        </span>
      )
    );

  const renderChanged = (diffArr: ReturnType<typeof diffWords>) =>
    diffArr.map((part, i) =>
      part.removed ? null : (
        <span key={i} className={part.added ? styles.addedText : undefined}>
          {part.value}
        </span>
      )
    );

  return (
    <div className={styles.container}>
      <h3>Review Before Send</h3>

      <div className={styles.section}>
        <h4 className={styles.label}>Subject</h4>
        <div className={`${styles.box} ${styles.originalBox}`}>{renderOriginal(subjectDiff)}</div>
        <div className={`${styles.box} ${styles.changedBox}`}>{renderChanged(subjectDiff)}</div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.label}>Body</h4>
        <div className={`${styles.box} ${styles.originalBox}`}>{renderOriginal(bodyDiff)}</div>
        <div className={`${styles.box} ${styles.changedBox}`}>{renderChanged(bodyDiff)}</div>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="secondary"
          onClick={onReject}
          shape="rounded"
          style={{
            backgroundColor: "#fff1f2",
            borderColor: "#ef4444",
            color: "#b91c1c",
          }}
        >
          Reject
        </Button>
        <Button
          appearance="primary"
          onClick={onConfirm}
          shape="rounded"
          style={{
            backgroundColor: "#ecfdf5",
            borderColor: "#10b981",
            color: "#047857",
          }}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};

export default DiffViewer;
