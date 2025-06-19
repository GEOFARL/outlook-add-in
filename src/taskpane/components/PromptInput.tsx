"use client";

import { Button, Input, makeStyles } from "@fluentui/react-components";
import React, { useState } from "react";

type Props = {
  onAdd: (text: string) => void;
  disabled?: boolean;
};

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.5rem",
    width: "100%",
  },
  input: {
    flex: 1,
  },
  addButton: {
    height: "32px", // match input height
    minWidth: "32px",
    padding: "0 8px",
  },
});

const PromptInput: React.FC<Props> = ({ onAdd, disabled }) => {
  const styles = useStyles();
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={styles.wrapper}>
      <Input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., Check tone"
        disabled={disabled}
        appearance="outline"
        aria-label="Prompt instruction"
      />
      <Button
        className={styles.addButton}
        onClick={handleAdd}
        disabled={disabled || !value.trim()}
        appearance="secondary"
        size="small"
        aria-label="Add prompt"
      >
        +
      </Button>
    </div>
  );
};

export default PromptInput;
