import React from "react";
import { diffWords } from "diff";

type Props = {
  original: string;
  changed: string;
  onEdit?: () => void;
  onReject?: () => void;
  onConfirm?: () => void;
};

const DiffViewer: React.FC<Props> = ({ original, changed, onEdit, onReject, onConfirm }) => {
  const diff = diffWords(original, changed);

  const renderOriginal = () =>
    diff.map((part, i) =>
      part.added ? null : (
        <span
          key={i}
          style={{
            backgroundColor: part.removed ? "#fdecea" : "transparent",
            color: part.removed ? "#d92d20" : undefined,
          }}
        >
          {part.value}
        </span>
      )
    );

  const renderChanged = () =>
    diff.map((part, i) =>
      part.removed ? null : (
        <span
          key={i}
          style={{
            backgroundColor: part.added ? "#ecfdf3" : "transparent",
            color: part.added ? "#027a48" : undefined,
          }}
        >
          {part.value}
        </span>
      )
    );

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Review Before Send</h3>
      <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem" }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontWeight: 600 }}>Original text</h4>
          <div
            style={{
              border: "2px dashed #3b82f6",
              borderRadius: 4,
              padding: "1rem",
              backgroundColor: "#f9fafb",
              minHeight: 150,
              whiteSpace: "pre-wrap",
            }}
          >
            {renderOriginal()}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontWeight: 600 }}>Changed text</h4>
          <div
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 4,
              padding: "1rem",
              border: "1px solid #e5e7eb",
              minHeight: 150,
              whiteSpace: "pre-wrap",
            }}
          >
            {renderChanged()}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          marginTop: "1.5rem",
        }}
      >
        <button
          onClick={onEdit}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ✏️ Edit manually
        </button>
        <button
          onClick={onReject}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ef4444",
            borderRadius: 6,
            background: "#fff1f2",
            color: "#b91c1c",
            cursor: "pointer",
          }}
        >
          ❌ Reject
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #10b981",
            borderRadius: 6,
            background: "#ecfdf5",
            color: "#047857",
            cursor: "pointer",
          }}
        >
          ✅ Confirm
        </button>
      </div>
    </div>
  );
};

export default DiffViewer;
