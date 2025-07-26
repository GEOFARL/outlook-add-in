"use client";

import React from "react";
import { Button, makeStyles } from "@fluentui/react-components";
import { useEnhancementStore } from "../stores/enhancement-store";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    height: "100%",
    minHeight: "550px",
    padding: "2rem",
    textAlign: "center",
    position: "relative",
  },
  icon: {
    fontSize: "64px",
    marginBottom: "36px",
    alignSelf: "center",
  },
  label: {
    fontSize: "14px",
    color: "#333",
  },
  labelContainer: {
    marginTop: "8px",
    display: "flex",
    justifyContent: "space-between",
  },
  progressBarOuter: {
    width: "100%",
    height: "6px",
    backgroundColor: "#e5e7eb",
    borderRadius: "3px",
    position: "relative",
    overflow: "hidden",
  },
  progressBarInner: {
    height: "6px",
    borderRadius: "3px",
    backgroundColor: "#0F6CBD",
    transition: "width 0.4s ease",
  },
  progressBarInnerError: {
    backgroundColor: "#b91c1c !important",
  },
  statusText: {
    fontSize: "14px",
    color: "#0F6CBD",
    fontWeight: 500,
  },
  statusTextError: {
    color: "#b91c1c !important",
  },
  error: {
    color: "#B83E21",
    backgroundColor: "#F9D9D9",
    padding: "0.5rem 1rem",
    marginTop: "12px",
    borderRadius: "4px",
  },
  errorContainer: {
    position: "absolute",
    top: "350px",
    left: "50%",
    transform: "translateX(-50%)",
    minWidth: "300px",
  },
  buttons: {
    marginTop: "10px",
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
  },
});

type Props = {
  error: string;
  onRetry: () => void;
};

export const EnhancementProgressScreen: React.FC<Props> = ({ error, onRetry }) => {
  const styles = useStyles();
  const progress = useEnhancementStore((s) => s.progress);

  return (
    <div className={styles.container}>
      <div className={styles.icon}>{error ? "❌" : "📝"}</div>

      <div className={styles.progressBarOuter}>
        <div
          className={`${styles.progressBarInner} ${error ? styles.progressBarInnerError : ""}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={styles.labelContainer}>
        <div className={styles.label}>Checking letter</div>
        <div className={`${styles.statusText} ${error ? styles.statusTextError : ""}`}>
          {error ? "Canceled" : `Uploading... ${progress}%`}
        </div>
      </div>

      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.error}>{error}</div>
          <div className={styles.buttons}>
            <Button onClick={onRetry}>Try again</Button>
          </div>
        </div>
      )}
    </div>
  );
};
