"use client";

import { FluentProvider, makeStyles } from "@fluentui/react-components";
import React, { useEffect } from "react";
import { useEmailBody } from "../hooks/use-email-body";
import { useOfficeTheme } from "../hooks/use-office-theme";
import { useEnhancementStore } from "../stores/enhancement-store";
import DiffViewer from "./DiffViewer";
import { EnhancementForm } from "./EnhancementForm";
import { EnhancementProgressScreen } from "./EnhancementProgressScreen";

const useStyles = makeStyles({
  container: {
    padding: "6px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "800px",
    minHeight: "550px",
  },
  title: {
    margin: "10px 0 0 0",
  },
});

const App = () => {
  const theme = useOfficeTheme();
  const styles = useStyles();
  const emailBody = useEmailBody();

  const {
    setBody,
    setResponseHtml,
    responseText,
    updatedSubject,
    loading,
    responseError: error,
    reset,
    handleRun,
  } = useEnhancementStore();
  const showLoadingScreen = loading || error;

  useEffect(() => {
    setBody(emailBody);
  }, [emailBody, setBody]);

  const handleConfirm = () => {
    const formattedHtml = `<p>${responseText.replace(/\n/g, "<br>")}</p>`;

    Office.context.mailbox.item.body.setAsync(formattedHtml, { coercionType: "html" });
    if (updatedSubject && updatedSubject.trim()) {
      Office.context.mailbox.item.subject.setAsync(updatedSubject, (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          console.error("Failed to set subject:", result.error);
        }
      });
    }

    setResponseHtml(formattedHtml);
    reset();
  };

  const handleReject = () => reset();

  return (
    <FluentProvider theme={theme}>
      <div className={styles.container}>
        {showLoadingScreen ? (
          <EnhancementProgressScreen error={error} onRetry={() => handleRun()} />
        ) : responseText ? (
          <DiffViewer onReject={handleReject} onConfirm={handleConfirm} />
        ) : (
          <>
            <h2 className={styles.title}>Customize Enhancement</h2>
            <EnhancementForm />
          </>
        )}
      </div>
    </FluentProvider>
  );
};

export default App;
