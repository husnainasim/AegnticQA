import type { LatencyBreakdown, TokenUsage } from "../types";

interface Props {
  latency: LatencyBreakdown;
  tokens: TokenUsage;
}

export function StatsBar({ latency, tokens }: Props) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
      <span className="rounded bg-gray-100 px-2 py-0.5">
        ⏱ {latency.total}ms total
      </span>
      {Object.entries(latency.by_step).map(([k, v]) => (
        <span key={k} className="rounded bg-gray-100 px-2 py-0.5">
          {k}: {v}ms
        </span>
      ))}
      <span className="rounded bg-gray-100 px-2 py-0.5">
        🔤 {tokens.prompt + tokens.completion} tokens
      </span>
    </div>
  );
}
