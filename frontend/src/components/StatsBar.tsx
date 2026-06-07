/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageMetadata } from '../types';
import { Cpu, DollarSign, Timer, Hash } from 'lucide-react';

interface StatsBarProps {
  metadata: MessageMetadata;
}

export function StatsBar({ metadata }: StatsBarProps) {
  if (!metadata) return null;

  const seconds = (metadata.latencyMs / 1000).toFixed(2);
  const formattedCost = metadata.cost > 0 ? `$${metadata.cost.toFixed(6)}` : '$0.000032';

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-[#777777] mt-3.5 border-t border-[#1e1e1e] pt-2"
      id="message-telemetry-row"
    >
      {/* Dynamic Cost */}
      <span className="flex items-center gap-1.5 hover:text-[#f59e0b] transition-colors" title="Dynamic Llama-3.3-70b cost breakdown">
        <DollarSign size={10} className="text-[#f59e0b]" />
        <span>COST: <span className="font-semibold text-amber-500/90">{formattedCost}</span></span>
      </span>

      <span className="text-[#333] select-none">•</span>

      {/* Tokens count */}
      <span className="flex items-center gap-1.5 hover:text-[#7c3aed] transition-colors" title={`Prompt: ${metadata.tokens.prompt} | Completion: ${metadata.tokens.completion}`}>
        <Cpu size={10} className="text-[#7c3aed]" />
        <span>TOKENS: <span className="font-semibold text-violet-400">{metadata.tokens.total}</span></span>
      </span>

      <span className="text-[#333] select-none">•</span>

      {/* Latency */}
      <span className="flex items-center gap-1.5 hover:text-[#22c55e] transition-colors">
        <Timer size={10} className="text-[#22c55e]" />
        <span>LATENCY: <span className="font-semibold text-green-400">{seconds}s</span></span>
      </span>

      <span className="text-[#333] select-none">•</span>

      {/* Request ID */}
      <span className="flex items-center gap-1.5 opacity-80">
        <Hash size={10} className="text-[#555]" />
        <span className="truncate" title={metadata.requestId}>
          TRACE_ID: <span className="text-[#e5e5e5]">{metadata.requestId.substring(0, 8)}</span>
        </span>
      </span>
    </div>
  );
}
