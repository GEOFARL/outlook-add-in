import {
  Button,
  Spinner,
  Textarea,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import React, { useState } from "react";
import { FluentProvider } from "@fluentui/react-components";
import { useOfficeTheme } from "../hooks/use-office-theme";
import { useEmailBody } from "../hooks/use-email-body";

const useStyles = makeStyles({
  container: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontWeight: tokens.fontWeightSemibold,
  },
  resultBox: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: "0.5rem",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    whiteSpace: "pre-wrap",
  },
});

const App = () => {
  const styles = useStyles();
  const theme = useOfficeTheme();
  const body = useEmailBody();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const handleRedact = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));

    const mockedResponse = {
      body: `<p><strong>[REDACTED]</strong> This is a clean version of your email.</p>`,
    };

    const combinedBody = `${body}\n\n---\n${mockedResponse.body}`;
    setResponse(combinedBody);

    Office.context.mailbox.item.body.setAsync(combinedBody, {
      coercionType: "html",
    });

    setLoading(false);
  };

  return (
    <FluentProvider theme={theme}>
      <div className={styles.container}>
        <h2>ML-Redact Review</h2>

        <div className={styles.section}>
          <span className={styles.label}>Original Email:</span>
          <Textarea rows={10} readOnly value={body} resize="vertical" />
        </div>

        <Button
          appearance="primary"
          onClick={handleRedact}
          disabled={loading}
          style={{ alignSelf: "flex-start" }}
        >
          {loading ? <Spinner /> : "Redact & Proofread"}
        </Button>

        {response && (
          <div className={styles.section}>
            <span className={styles.label}>Processed Result:</span>
            <div
              className={styles.resultBox}
              dangerouslySetInnerHTML={{ __html: response }}
            />
          </div>
        )}
      </div>
    </FluentProvider>
  );
};

export default App;
