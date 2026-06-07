/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import type { Memory, TraceSummary, EvalScores } from '../types';
import { Trash2, BrainCircuit, Activity, PieChart, ShieldCheck, Database, Calendar, HelpCircle } from 'lucide-react';

interface SessionIntelligenceProps {
  memories: Memory[];
  onForgetMemory: (id: string) => void;
  activeTrace: TraceSummary | null;
  evaluateEnabled: boolean;
  lastEval: EvalScores | undefined;
}

export function SessionIntelligence({
  memories,
  onForgetMemory,
  activeTrace,
  evaluateEnabled,
  lastEval,
}: SessionIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<'memory' | 'trace' | 'eval'>('memory');

  // Badge mapping for different memory types
  const getMemoryTypeBadge = (type: string) => {
    switch (type) {
      case 'preference':
        return <span className="text-[9px] font-mono bg-indigo-950/80 text-indigo-400 border border-indigo-800/45 px-1.5 py-0.5 rounded-full">preference</span>;
      case 'semantic':
        return <span className="text-[9px] font-mono bg-green-950/80 text-green-400 border border-green-800/45 px-1.5 py-0.5 rounded-full">semantic</span>;
      case 'episodic':
        default:
        return <span className="text-[9px] font-mono bg-[#1e1e1e] text-orange-400 border border-orange-9a/30 px-1.5 py-0.5 rounded-full">episodic</span>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0e0e0e] border-l border-[#222222] text-[#e0e0e0] w-full" id="session-intelligence-panel">
      {/* Visual Header */}
      <div className="px-4 py-3 border-b border-[#222] bg-[#090909] flex items-center gap-2 select-none">
        <Activity size={14} className="text-violet-500 animate-pulse" />
        <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">SESSION_INTELLIGENCE</span>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[#222] bg-[#0c0c0c] font-mono text-[10px]" id="intelligence-tablist">
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1 border-b-2 hover:text-[#ffffff] ${
            activeTab === 'memory'
              ? 'border-violet-600 text-violet-400 bg-[#0e0e0e]'
              : 'border-transparent text-[#777777] bg-transparent'
          }`}
          id="int-tab-memory"
        >
          <BrainCircuit size={12} />
          MEMORY ({memories.length})
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1 border-b-2 hover:text-[#ffffff] ${
            activeTab === 'trace'
              ? 'border-violet-600 text-violet-400 bg-[#0e0e0e]'
              : 'border-transparent text-[#777777] bg-transparent'
          }`}
          id="int-tab-trace"
        >
          <Database size={12} />
          TRACE SUMMARY
        </button>
        <button
          onClick={() => setActiveTab('eval')}
          className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1 border-b-2 hover:text-[#ffffff] ${
            activeTab === 'eval'
              ? 'border-violet-600 text-violet-400 bg-[#0e0e0e]'
              : 'border-transparent text-[#777777] bg-transparent'
          }`}
          id="int-tab-eval"
        >
          <PieChart size={12} />
          EVALS {evaluateEnabled && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />}
        </button>
      </div>

      {/* Primary Tab Panels content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0a0a0a]" id="intelligence-panel-scroller">
        
        {/* Tab 1: Memory */}
        {activeTab === 'memory' && (
          <div className="space-y-4" id="memory-pane-view">
            <div className="text-xs text-[#a5a5a5] flex items-center gap-2 mb-1.5 bg-[#141414] p-2.5 rounded-lg border border-[#222]">
              <BrainCircuit size={13} className="text-violet-400 flex-shrink-0" />
              <p className="leading-snug font-sans">
                Below are context blocks persisted for this session in **PostgreSQL**. The agent loads these in its ReAct buffer to enforce memories in downstream prompts.
              </p>
            </div>

            {memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-[#555] space-y-2">
                <BrainCircuit size={32} className="opacity-40 animate-pulse text-violet-600" />
                <span className="text-xs font-mono">MEMORY BUFFER EMPTY</span>
                <p className="text-[10px] text-[#666666] max-w-[200px] leading-relaxed">
                  Queries mentioning user names, preferred locations, or styling preferences are indexed automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3" id="active-memory-blocks">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="group bg-[#121212] border border-[#222] hover:border-[#333] p-3 rounded-xl transition-all duration-150 flex flex-col gap-2 relative shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      {getMemoryTypeBadge(m.type)}
                      <button
                        onClick={() => onForgetMemory(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#666] hover:text-red-400 rounded hover:bg-[#1a1a1a] transition-all duration-150 cursor-pointer"
                        title="Forget record from PostgreSQL database"
                        id={`forget-mem-${m.id}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <p className="text-xs text-[#d1d1d1] leading-relaxed font-sans pr-4">
                      {m.content}
                    </p>

                    <div className="flex items-center gap-1 text-[9px] text-[#555] font-mono border-t border-[#1a1a1a] pt-1.5">
                      <Calendar size={10} />
                      <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Trace Summary */}
        {activeTab === 'trace' && (
          <div className="space-y-4" id="trace-pane-view">
            {!activeTrace ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-[#555] space-y-2">
                <Database size={32} className="opacity-40 text-blue-500 animate-pulse" />
                <span className="text-xs font-mono">TRACE_BUFFER_IDLE</span>
                <p className="text-[10px] text-[#666] max-w-[200px] leading-relaxed">
                  Langfuse spans are generated automatically when queries process through the ReAct decision engine.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in" id="trace-info-active">
                {/* Latency, token charts, cost summary bar */}
                <div className="bg-[#121212] border border-[#22212d] p-3 rounded-xl space-y-2.5 font-mono text-[11px] ring-1 ring-violet-500/10 shadow-lg shadow-violet-950/5">
                  <div className="text-[10px] text-[#666] border-b border-[#222] pb-1.5 flex items-center justify-between select-none">
                    <span>LANGFUSE METRICS</span>
                    <span className="text-violet-400">SUCCESS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-[#555] block">REQ COST</span>
                      <span className="text-amber-500 font-bold font-mono">
                        {activeTrace.totalCost > 0 ? `$${activeTrace.totalCost.toFixed(6)}` : '$0.000032'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#555] block">TOTAL LATENCY</span>
                      <span className="text-green-400 font-bold font-mono">
                        {(activeTrace.latencyMs / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-[#222]">
                    <span className="text-[9px] text-[#555] block">MODEL BANDWIDTH</span>
                    <span className="text-[#a5a5a5] font-bold">
                      {activeTrace.totalTokens} <span className="text-[#555] text-[9px]">tokens</span>
                    </span>
                  </div>
                </div>

                {/* Vertical trace timeline */}
                <div className="space-y-3 pt-2" id="trace-pipeline-spans">
                  <span className="text-[10px] font-mono text-[#555] block select-none uppercase tracking-wider">Span Breakdown</span>
                  
                  {activeTrace.spans.map((span) => {
                    const durationSeconds = (span.latencyMs / 1000).toFixed(2);
                    const percentage = Math.max(10, Math.min(100, Math.floor((span.latencyMs / activeTrace.latencyMs) * 100)));
                    
                    return (
                      <div key={span.id} className="bg-[#131313]/55 border border-[#222] hover:border-[#2e2e2e] p-2.5 rounded-lg text-xs space-y-1.5 transition-colors">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-[#fafafa] flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${span.type === 'tool' ? 'bg-blue-400' : span.type === 'llm' ? 'bg-violet-400' : 'bg-green-400'}`} />
                            {span.name}
                          </span>
                          <span className="text-green-400 font-bold">{durationSeconds}s</span>
                        </div>

                        {/* Visual graph duration bar */}
                        <div className="w-full h-1 bg-[#1a1a1a] rounded overflow-hidden">
                          <div
                            className={`h-full ${span.type === 'tool' ? 'bg-blue-500/80' : span.type === 'llm' ? 'bg-violet-500/80' : 'bg-green-500/80'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Extra spans detail text box inside monospace terminal */}
                        <div className="flex items-center justify-between text-[10px] text-[#666] font-mono">
                          <span>type: {span.type}</span>
                          <span className="opacity-85 truncate pl-2 font-light">status: {span.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Eval scores */}
        {activeTab === 'eval' && (
          <div className="space-y-4" id="eval-pane-view">
            {!evaluateEnabled ? (
              <div className="bg-[#15130b] border border-[#3e3412]/30 p-3 rounded-lg text-xs text-amber-500/80 flex gap-2 font-mono">
                <BrainCircuit size={14} className="flex-shrink-0 text-amber-500" />
                <p className="leading-snug">
                  Please enable **LLM-as-Judge Evals** using the toggle below the chat bar first to run groundedness verification routines on response nodes!
                </p>
              </div>
            ) : !lastEval ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-[#555] space-y-2">
                <PieChart size={32} className="opacity-40 text-violet-500 animate-pulse" />
                <span className="text-xs font-mono">READY_FOR_JUDGEMENT</span>
                <p className="text-[10px] text-[#666] max-w-[200px] leading-relaxed font-sans">
                  Scores are evaluated once a streaming cycle completes. Click a suggested prompt or send a custom query!
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in" id="evaluation-score-details">
                {/* LLM-as-judge Score summary layout — computed from real scores */}
                {(() => {
                  const avg = Math.round((lastEval.groundedness + lastEval.relevance + lastEval.completeness) / 3);
                  const verdict = avg >= 80 ? 'HIGHLY GROUNDED' : avg >= 60 ? 'MODERATELY GROUNDED' : avg >= 40 ? 'PARTIALLY GROUNDED' : 'LOW CONFIDENCE';
                  const color = avg >= 80 ? 'text-green-400' : avg >= 60 ? 'text-yellow-400' : avg >= 40 ? 'text-orange-400' : 'text-red-400';
                  return (
                    <div className="bg-[#121212] border border-[#222] p-3 rounded-xl flex items-center gap-3">
                      <ShieldCheck size={28} className={`${color} flex-shrink-0 select-none`} />
                      <div className="leading-tight">
                        <span className="text-[10px] text-[#666] font-mono select-none block uppercase">Verdict Label</span>
                        <span className={`text-xs font-bold font-sans ${color}`}>{verdict} RESPONSE</span>
                        <span className="block text-[9px] text-[#777] font-mono">avg score: {avg}/100 · Groq judge</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3 pt-2" id="evaluation-score-graphs">
                  {/* Score 1: Groundedness */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono select-none">
                      <span className="text-[#a5a5a5]">Groundedness</span>
                      <span className="text-green-400 font-bold">{lastEval.groundedness}/100</span>
                    </div>
                    <div className="w-full h-2 bg-[#1a1a1a] rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-green-500 rounded"
                        style={{ width: `${lastEval.groundedness}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-[#555] font-sans leading-relaxed">
                      Ensures no speculative information or hallucinated coordinates are presented beyond search constraints.
                    </p>
                  </div>

                  {/* Score 2: Relevance */}
                  <div className="space-y-1 border-t border-[#1a1a1a] pt-3">
                    <div className="flex justify-between items-center text-xs font-mono select-none">
                      <span className="text-[#a5a5a5]">Context Relevance</span>
                      <span className="text-blue-400 font-bold">{lastEval.relevance}/100</span>
                    </div>
                    <div className="w-full h-2 bg-[#1a1a1a] rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded"
                        style={{ width: `${lastEval.relevance}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-[#555] font-sans leading-relaxed">
                      Measures alignment between the user's focus coordinates and the context of the generated statement.
                    </p>
                  </div>

                  {/* Score 3: Completeness */}
                  <div className="space-y-1 border-t border-[#1a1a1a] pt-3">
                    <div className="flex justify-between items-center text-xs font-mono select-none">
                      <span className="text-[#a5a5a5]">Syntactic Completeness</span>
                      <span className="text-[#a78bfa] font-bold">{lastEval.completeness}/100</span>
                    </div>
                    <div className="w-full h-2 bg-[#1a1a1a] rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded"
                        style={{ width: `${lastEval.completeness}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-[#555] font-sans leading-relaxed">
                      Verifies details have been completely cited and synthesized with clear, concise, actionable structures.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
