/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReasoningStep {
  id: string;
  iteration: number;
  thought: string;
  action?: string;
  actionInput?: string;
  observation?: string;
  timestamp: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

export interface MessageMetadata {
  cost: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  requestId: string;
}

export interface EvalScores {
  groundedness: number; // 0-100
  relevance: number;    // 0-100
  completeness: number; // 0-100
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  reasoningSteps?: ReasoningStep[];
  sources?: Source[];
  metadata?: MessageMetadata;
  evalScores?: EvalScores;
}

export interface Session {
  id: string;
  sessionId: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

export const MEMORY_TYPES = ['episodic', 'semantic', 'preference'] as const;
export type MemoryType = typeof MEMORY_TYPES[number];

export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  timestamp: string;
}

export interface TraceSpan {
  id: string;
  name: string;
  type: 'llm' | 'tool' | 'agent';
  startTime: number;
  endTime: number;
  latencyMs: number;
  status: 'success' | 'error';
  input: string;
  output: string;
  tokens?: number;
  cost?: number;
}

export interface TraceSummary {
  requestId: string;
  totalCost: number;
  totalTokens: number;
  latencyMs: number;
  spans: TraceSpan[];
}
