"use client";

import { FluentProvider, makeStyles } from "@fluentui/react-components";
import React from "react";
import { useEmailBody } from "../hooks/use-email-body";
import { useOfficeTheme } from "../hooks/use-office-theme";
import { useEnhancement } from "../hooks/use-enhancement";
import { EnhancementForm } from "./EnhancementForm";

const useStyles = makeStyles({
  container: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "600px",
  },
});

const App = () => {
  const theme = useOfficeTheme();
  const styles = useStyles();
  const body = useEmailBody();
  const enhancement = useEnhancement(body);

  return (
    <FluentProvider theme={theme}>
      <div className={styles.container}>
        <h2>Customize Enhancement</h2>
        <EnhancementForm body={body} {...enhancement} />
      </div>
    </FluentProvider>
  );
};

export default App;
