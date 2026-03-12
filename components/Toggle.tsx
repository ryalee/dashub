"use client";

interface Props { checked: boolean; onChange: (v: boolean) => void; }

export default function Toggle({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 99, flexShrink: 0, border: "none",
        cursor: "pointer", position: "relative", transition: "background 0.2s",
        background: checked ? "var(--accent)" : "var(--border-2)",
        boxShadow: checked ? "0 0 8px var(--accent-glow)" : "none",
      }}
    >
      <span style={{
        position: "absolute", top: 2, borderRadius: 99,
        width: 20, height: 20, background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        left: checked ? "calc(100% - 22px)" : 2,
        transition: "left 0.2s",
      }} />
    </button>
  );
}
