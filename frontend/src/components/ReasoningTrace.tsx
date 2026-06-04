import { useState } from "react";

export function ReasoningTrace({ trace }: { trace: string[] }) {
  const [open, setOpen] = useState(false);
  if (!trace.length) return null;
  return (
    <div className="mt-3 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 font-medium"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>Reasoning trace ({trace.length} step{trace.length > 1 ? "s" : ""})</span>
      </button>
      {open && (
        <ol className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
          {trace.map((step, i) => (
            <li key={i} className="text-gray-500 font-mono break-all">
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
