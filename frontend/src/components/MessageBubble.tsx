import type { ChatMessage } from "../types";
import { SourcesList } from "./SourcesList";
import { ReasoningTrace } from "./ReasoningTrace";
import { StatsBar } from "./StatsBar";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isError = message.role === "error";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-2xl rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "bg-brand text-white rounded-tr-sm"
            : isError
            ? "bg-red-50 text-red-700 border border-red-200 rounded-tl-sm"
            : "bg-white border border-gray-200 rounded-tl-sm"
        }`}
      >
        {message.loading ? (
          <div className="flex gap-1 items-center py-1">
            <span className="animate-bounce text-gray-400" style={{ animationDelay: "0ms" }}>●</span>
            <span className="animate-bounce text-gray-400" style={{ animationDelay: "150ms" }}>●</span>
            <span className="animate-bounce text-gray-400" style={{ animationDelay: "300ms" }}>●</span>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
            {message.response && (
              <>
                <SourcesList sources={message.response.sources} />
                <ReasoningTrace trace={message.response.reasoning_trace} />
                <StatsBar
                  latency={message.response.latency_ms}
                  tokens={message.response.tokens}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
