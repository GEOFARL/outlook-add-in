"use client";

import { FluentProvider, makeStyles } from "@fluentui/react-components";
import React, { useEffect } from "react";
import { useOfficeTheme } from "../hooks/use-office-theme";
import { useEmailBody } from "../hooks/use-email-body";
import { useEnhancementStore } from "../stores/enhancement-store";
import { EnhancementForm } from "./EnhancementForm";
import DiffViewer from "./DiffViewer";

const useStyles = makeStyles({
  container: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "800px",
  },
});

const App = () => {
  const theme = useOfficeTheme();
  const styles = useStyles();
  const emailBody = useEmailBody();

  const { setBody, responseText, setResponseHtml, reset } = useEnhancementStore();

  useEffect(() => {
    setBody(emailBody);
  }, [emailBody, setBody]);

  const handleConfirm = () => {
    const formattedHtml = `<p>${responseText.replace(/\n/g, "<br>")}</p>`;
    Office.context.mailbox.item.body.setAsync(formattedHtml, { coercionType: "html" });
    setResponseHtml(formattedHtml);
    reset();
  };

  const handleReject = () => reset();

  return (
    <FluentProvider theme={theme}>
      <div className={styles.container}>
        {responseText ? (
          <DiffViewer onReject={handleReject} onConfirm={handleConfirm} />
        ) : (
          <>
            <h2>Customize Enhancement</h2>
            <EnhancementForm />
          </>
        )}
      </div>
    </FluentProvider>
  );
};

export default App;
