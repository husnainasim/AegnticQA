/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { ReasoningStep } from '../types';
import { Terminal, ChevronDown, ChevronUp, Cpu, Flame } from 'lucide-react';

interface ReasoningTraceProps {
  steps: ReasoningStep[];
}

export function ReasoningTrace({ steps }: ReasoningTraceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="w-full mb-3 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] overflow-hidden" id="react-thinking-panel">
      {/* Header bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#121212] hover:bg-[#161616] transition-colors text-xs font-mono select-none text-[#a5a5a5] border-b border-[#2a2a2a]"
        id="toggle-reasoning-steps"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#4ade80]" />
          <span className="font-bold flex items-center gap-1.5 text-[#e5e5e5]">
            <Cpu size={12} className="animate-pulse text-[#4ade80]" /> 
            ReAct Loop 
          </span>
          <span className="text-[#555555]">|</span>
          <span className="text-[#4ade80]">↳ {steps.length} reasoning steps</span>
        </div>
        <div className="flex items-center gap-1 text-[#888888]">
          <span className="text-[10px] bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2e2e2e]">Llama-3.3-70b</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Terminal Steps View */}
      {isExpanded && (
        <div className="p-3 font-mono text-xs space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#080808]" id="reasoning-flow-body">
          {steps.map((step, idx) => (
            <div key={step.id || idx} className="space-y-1.5 border-l-2 border-[#2b2b2b] pl-3.5 ml-1 animate-fade-in">
              <div className="flex items-center gap-2 text-[#888888] font-bold text-[11px]">
                <span className="text-[#4ade80] bg-[#14291c] px-1.5 py-0.2 rounded text-[10px] border border-[#22c55e]/20">
                  ITERATION {step.iteration}
                </span>
                <span>@{new Date(step.timestamp).toLocaleTimeString()}</span>
              </div>

              {/* Thought block */}
              <div className="text-[#d4d4d4] leading-relaxed">
                <span className="text-[#888888] select-none mr-1.5">THOUGHT:</span>
                {step.thought}
              </div>

              {/* Action/Tool Call block */}
              {step.action && (
                <div className="text-[#38bdf8] bg-[#0c202d] px-2.5 py-1.5 rounded border border-[#0d5985]/30 my-1 self-start">
                  <div className="font-bold text-[10px] text-[#0ea5e9] flex items-center gap-1 uppercase select-none">
                    <Flame size={10} className="animate-pulse" /> Triggered Tool Call
                  </div>
                  <div className="mt-0.5 font-mono">
                    <span className="text-[#f472b6] font-semibold">{step.action}</span>
                    <span className="text-[#94a3b8]">(</span>
                    <code className="text-[#a78bfa]">{step.actionInput}</code>
                    <span className="text-[#94a3b8]">)</span>
                  </div>
                </div>
              )}

              {/* Observation block */}
              {step.observation && (
                <div className="text-[#e2e8f0] bg-[#1a1a1a] p-2 rounded border border-[#2e2e2e] mt-1 space-y-0.5 font-mono text-[11px]">
                  <span className="text-[#e11d48] font-semibold uppercase text-[9px] block tracking-wider select-none">
                    [OBSERVATION LAYER]
                  </span>
                  <div className="text-[#4ade80] opacity-95 break-all">
                    {step.observation}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
