/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, AlertCircle } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  activeSessionId: string;
  evaluateEnabled: boolean;
  setEvaluateEnabled: (val: boolean) => void;
}

export function ChatInput({
  onSend,
  isStreaming,
  activeSessionId,
  evaluateEnabled,
  setEvaluateEnabled,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    onSend(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize search input field depending on statement length
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 140)}px`;
    }
  }, [inputValue]);

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col gap-2.5 pb-4 pt-2 bg-[#0d0d0d]"
      id="chat-input-form"
    >
      <div className="relative w-full flex items-end bg-[#131313] hover:bg-[#151515] focus-within:bg-[#121212] border border-[#2a2a2a] focus-within:border-violet-600/60 focus-within:ring-2 focus-within:ring-violet-950/40 rounded-2xl p-2.5 transition-all duration-200">
        
        {/* Left indicators */}
        <div className="flex items-center pl-1.5 pb-2 text-[#7c3aed]" id="decor-spark">
          <Sparkles size={15} className="animate-pulse" />
        </div>

        {/* Input Textarea for comfortable multi-line typing */}
        <textarea
          ref={inputRef}
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Agentic QA about weather in Lahore or latest AI research..."
          className="flex-1 max-h-[140px] resize-none bg-transparent outline-none overflow-y-auto px-3.5 py-1 text-xs text-[#e5e5e5] placeholder-[#666666] font-sans h-8"
          disabled={isStreaming}
          id="chat-textarea-box"
        />

        {/* Send Action Trigger arrow button */}
        <button
          type="submit"
          disabled={!inputValue.trim() || isStreaming}
          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
            inputValue.trim() && !isStreaming
              ? 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] cursor-pointer'
              : 'bg-[#1e1e1e] text-[#444444] cursor-not-allowed'
          }`}
          id="submit-prompt-button"
        >
          <ArrowUp size={16} className={isStreaming ? 'animate-bounce' : ''} />
        </button>
      </div>

      {/* Under-Console Status & Toggle row */}
      <div className="flex items-center justify-between px-2 text-[10px] font-mono text-[#666666] select-none" id="input-helper-toolbar">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
          <span>SESSION:</span>
          <span className="text-[#a5a5a5] max-w-[120px] truncate" title={activeSessionId}>
            {activeSessionId ? activeSessionId.substring(0, 12) : 'active_core_io'}
          </span>
        </div>

        {/* Evaluate check switch */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-[#888888]">
            <AlertCircle size={11} className="text-[#a5a5a5]" />
            LLM-as-Judge Evals
          </span>
          <button
            type="button"
            onClick={() => setEvaluateEnabled(!evaluateEnabled)}
            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200 outline-none ${
              evaluateEnabled ? 'bg-[#7c3aed]' : 'bg-[#222222]'
            }`}
            id="toggle-evals-switch"
          >
            <span
              className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-200 ${
                evaluateEnabled ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </form>
  );
}
