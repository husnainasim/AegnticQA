export interface Source {
  name: string;
  url: string;
}

export interface LatencyBreakdown {
  total: number;
  by_step: Record<string, number>;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
}

export interface QAResponse {
  answer: string;
  sources: Source[];
  latency_ms: LatencyBreakdown;
  tokens: TokenUsage;
  reasoning_trace: string[];
}

export type MessageRole = "user" | "assistant" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  response?: QAResponse;
  loading?: boolean;
}
