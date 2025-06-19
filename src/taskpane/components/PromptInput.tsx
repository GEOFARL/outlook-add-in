import { Button, Input } from "@fluentui/react-components";
import React, { useState } from "react";

type Props = {
  onAdd: (text: string) => void;
  disabled?: boolean;
};

const PromptInput: React.FC<Props> = ({ onAdd, disabled }) => {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    onAdd(value.trim());
    setValue("");
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g., Check tone"
        disabled={disabled}
      />
      <Button onClick={handleAdd} disabled={disabled || !value.trim()}>
        +
      </Button>
    </div>
  );
};

export default PromptInput;
