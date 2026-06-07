/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import type { Message, ReasoningStep, Source, Session, Memory, TraceSummary, TraceSpan, EvalScores } from '../types';

// ── Backend response shapes ───────────────────────────────────────────────────

interface BackendSource {
  name: string;
  url: string;
}

interface BackendLatency {
  total: number;
  by_step: Record<string, number>;
}

interface BackendTokens {
  prompt: number;
  completion: number;
}

interface BackendEval {
  groundedness: number;
  relevance: number;
  completeness: number;
  overall: number;
  reasoning: string;
}

interface BackendMemory {
  id: string;
  content: string;
  type: 'episodic' | 'semantic' | 'preference';
  created_at: string;
}

interface QAResponse {
  answer: string;
  sources: BackendSource[];
  latency_ms: BackendLatency;
  tokens: BackendTokens;
  reasoning_trace: string[];
  request_id: string;
  cost_usd: number;
  memories_used: string[];
  session_id: string | null;
  eval: BackendEval | null;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapSources(backendSources: BackendSource[]): Source[] {
  return (backendSources || [])
    .filter(s => s.url && s.url.startsWith('http'))
    .map(s => {
      let domain = s.url;
      try { domain = new URL(s.url).hostname; } catch { /* keep url */ }
      return {
        id: crypto.randomUUID(),
        title: s.name || domain,
        url: s.url,
        domain,
        snippet: '',
      };
    });
}

function mapReasoningSteps(traces: string[]): ReasoningStep[] {
  return (traces || []).map((trace, i) => {
    const iterMatch = trace.match(/Iteration\s+(\d+):\s+(.+)/i);
    const iteration = iterMatch ? parseInt(iterMatch[1]) : i + 1;
    const body = iterMatch ? iterMatch[2] : trace;

    const toolMatch = body.match(/called\s+(\w+)\s*\((.+)\)/i) ||
                      body.match(/calling\s+(\w+)\s+with\s+(.+)/i);
    if (toolMatch) {
      return {
        id: `step_${i}`,
        iteration,
        thought: `Decided to call ${toolMatch[1]} to get the needed information.`,
        action: toolMatch[1],
        actionInput: toolMatch[2],
        timestamp: new Date().toISOString(),
      };
    }

    const obsMatch = body.match(/(?:got result|result:|observation:)\s*(.+)/i);
    if (obsMatch) {
      return {
        id: `step_${i}`,
        iteration,
        thought: 'Processing tool result.',
        observation: obsMatch[1],
        timestamp: new Date().toISOString(),
      };
    }

    return {
      id: `step_${i}`,
      iteration,
      thought: body,
      timestamp: new Date().toISOString(),
    };
  });
}

function mapTraceSummary(response: QAResponse): TraceSummary {
  const byStep = response.latency_ms?.by_step || {};
  const spans: TraceSpan[] = Object.entries(byStep).map(([name, ms]) => {
    const type: TraceSpan['type'] = name.startsWith('llm') ? 'llm'
      : (name.startsWith('tool') || name.startsWith('retrieve')) ? 'tool' : 'agent';
    return {
      id: name,
      name,
      type,
      startTime: Date.now() - ms,
      endTime: Date.now(),
      latencyMs: ms,
      status: 'success',
      input: '',
      output: '',
    };
  });

  spans.unshift({
    id: 'agent_loop',
    name: 'Agentic ReAct Loop',
    type: 'agent',
    startTime: Date.now() - (response.latency_ms?.total || 0),
    endTime: Date.now(),
    latencyMs: response.latency_ms?.total || 0,
    status: 'success',
    input: '',
    output: '',
  });

  return {
    requestId: response.request_id || 'unknown',
    totalCost: response.cost_usd || 0,
    totalTokens: (response.tokens?.prompt || 0) + (response.tokens?.completion || 0),
    latencyMs: response.latency_ms?.total || 0,
    spans,
  };
}

function mapEvalScores(backendEval: BackendEval | null): EvalScores | undefined {
  if (!backendEval) return undefined;
  return {
    groundedness: Math.round((backendEval.groundedness || 0) * 20),
    relevance: Math.round((backendEval.relevance || 0) * 20),
    completeness: Math.round((backendEval.completeness || 0) * 20),
  };
}

// ── Memory API helpers ────────────────────────────────────────────────────────

async function fetchMemories(sessionId: string): Promise<Memory[]> {
  try {
    const res = await fetch(`/memory/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.memories || []).map((m: BackendMemory) => ({
      id: m.id,
      content: m.content,
      type: m.type as Memory['type'],
      timestamp: m.created_at,
    }));
  } catch {
    return [];
  }
}

export async function deleteMemoryById(sessionId: string, memoryId: string): Promise<void> {
  try {
    await fetch(`/memory/${encodeURIComponent(sessionId)}/${encodeURIComponent(memoryId)}`, {
      method: 'DELETE',
    });
  } catch { /* silently ignore */ }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useStreamingQuery() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTrace, setActiveTrace] = useState<TraceSummary | null>(null);

  const startStream = useCallback(async (
    queryText: string,
    session: Session,
    updateSession: (updated: Session) => void,
    setMemories: (updater: (prev: Memory[]) => Memory[]) => void,
    evaluateEnabled: boolean,
  ) => {
    if (isStreaming) return;
    setIsStreaming(true);
    setActiveTrace(null);

    const userMsg: Message = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = 'msg_assistant_' + (Date.now() + 1);
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
      reasoningSteps: [],
      sources: [],
    };

    const baseMessages = [...session.messages, userMsg];
    updateSession({ ...session, messages: [...baseMessages, assistantMsg] });

    const patch = (partial: Partial<Message>) =>
      updateSession({ ...session, messages: [...baseMessages, { ...assistantMsg, ...partial }] });

    try {
      const res = await fetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          session_id: session.sessionId,
          evaluate: evaluateEnabled,
          max_iterations: 5,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        patch({ content: err.error || `Request failed (${res.status})`, isStreaming: false });
        return;
      }

      const response: QAResponse = await res.json();

      const reasoningSteps = mapReasoningSteps(response.reasoning_trace);
      const sources = mapSources(response.sources);
      const trace = mapTraceSummary(response);
      const evalScores = mapEvalScores(response.eval);
      const metadata = {
        cost: response.cost_usd || 0,
        tokens: {
          prompt: response.tokens?.prompt || 0,
          completion: response.tokens?.completion || 0,
          total: (response.tokens?.prompt || 0) + (response.tokens?.completion || 0),
        },
        latencyMs: response.latency_ms?.total || 0,
        requestId: response.request_id || 'unknown',
      };

      // Animate reasoning steps
      for (let i = 0; i < reasoningSteps.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        patch({ reasoningSteps: reasoningSteps.slice(0, i + 1) });
      }
      if (reasoningSteps.length === 0) {
        await new Promise(r => setTimeout(r, 300));
      }

      setActiveTrace(trace);

      // Word-by-word stream of real answer
      const words = response.answer.split(' ');
      let currentText = '';
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        patch({ content: currentText, reasoningSteps });
        await new Promise(r => setTimeout(r, Math.max(12, 40 - words[i].length * 2)));
      }

      // Finalize
      updateSession({
        ...session,
        messages: [
          ...baseMessages,
          {
            ...assistantMsg,
            content: response.answer,
            isStreaming: false,
            reasoningSteps,
            sources,
            metadata,
            evalScores,
          },
        ],
      });

      // Sync real memories
      const realMemories = await fetchMemories(session.sessionId);
      if (realMemories.length > 0) {
        setMemories(() => realMemories);
      }

    } catch (err) {
      patch({ content: `Error: ${String(err)}`, isStreaming: false });
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  return { isStreaming, startStream, activeTrace, setActiveTrace };
}
