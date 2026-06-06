import { useRef, useEffect } from "react";
import { ChatInput } from "./components/ChatInput";
import { MessageBubble } from "./components/MessageBubble";
import { useStreamingQuery } from "./hooks/useStreamingQuery";

export default function App() {
  const { messages, loading, sendQuery } = useStreamingQuery();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
          QA
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 text-sm">Agentic QA</h1>
          <p className="text-xs text-gray-500">Powered by Groq (llama-3.3-70b) · DuckDuckGo · OpenWeatherMap</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 select-none">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium text-gray-600">Ask me anything</p>
            <p className="text-sm mt-1">
              Try: <em>"What's the weather in Tokyo?"</em> or <em>"What is quantum computing?"</em>
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-4 shadow-up">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={sendQuery} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
