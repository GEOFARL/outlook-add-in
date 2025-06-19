"use client";

import React from "react";
import { diffWords } from "diff";
import { makeStyles } from "@fluentui/react-components";
import { useEnhancementStore } from "../stores/enhancement-store";

type Props = {
  onReject?: () => void;
  onConfirm?: () => void;
};

const useStyles = makeStyles({
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    marginTop: "1rem",
  },
  column: { flex: 1 },
  label: { fontWeight: 600 },
  box: {
    backgroundColor: "#f9fafb",
    borderRadius: "4px",
    padding: "1rem",
    minHeight: "150px",
    whiteSpace: "pre-wrap",
  },
  originalBox: {
    border: "2px dashed #3b82f6",
  },
  changedBox: {
    border: "1px solid #e5e7eb",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
  button: {
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    background: "#fff",
    border: "1px solid #d1d5db",
    cursor: "pointer",
  },
  reject: {
    border: "1px solid #ef4444",
    backgroundColor: "#fff1f2",
    color: "#b91c1c",
  },
  confirm: {
    border: "1px solid #10b981",
    backgroundColor: "#ecfdf5",
    color: "#047857",
  },
  removedText: {
    backgroundColor: "#fdecea",
    color: "#d92d20",
  },
  addedText: {
    backgroundColor: "#ecfdf3",
    color: "#027a48",
  },
});

const DiffViewer: React.FC<Props> = ({ onReject, onConfirm }) => {
  const styles = useStyles();
  const { body: original, responseText: changed } = useEnhancementStore();

  const diff = diffWords(original, changed);

  const renderOriginal = () =>
    diff.map((part, i) =>
      part.added ? null : (
        <span key={i} className={part.removed ? styles.removedText : undefined}>
          {part.value}
        </span>
      )
    );

  const renderChanged = () =>
    diff.map((part, i) =>
      part.removed ? null : (
        <span key={i} className={part.added ? styles.addedText : undefined}>
          {part.value}
        </span>
      )
    );

  return (
    <div>
      <h3>Review Before Send</h3>
      <div className={styles.row}>
        <div className={styles.column}>
          <h4 className={styles.label}>Original text</h4>
          <div className={`${styles.box} ${styles.originalBox}`}>{renderOriginal()}</div>
        </div>
        <div className={styles.column}>
          <h4 className={styles.label}>Changed text</h4>
          <div className={`${styles.box} ${styles.changedBox}`}>{renderChanged()}</div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.reject}`} onClick={onReject}>
          Reject
        </button>
        <button className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </div>
  );
};

export default DiffViewer;
