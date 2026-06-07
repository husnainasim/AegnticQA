/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Message } from '../types';
import { ReasoningTrace } from './ReasoningTrace';
import { SourcesList } from './SourcesList';
import { StatsBar } from './StatsBar';
import { User, ShieldAlert } from 'lucide-react';

interface MessageBubbleProps {
  key?: React.Key;
  message: Message;
}

// Highly reliable, fast, and secure inline text structure parser to format Markdown strings
// safely into styled Tsx elements without introducing heavy third-party parsing vulnerabilities.
function formatMarkdownContent(text: string) {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // 1. Double backticks or full code block
    if (line.startsWith('```')) {
      const language = line.substring(3).trim();
      if (language) return null; // We format content in-between
      return null;
    }

    // 2. Headings (### or ## or #)
    if (line.startsWith('### ')) {
      return (
        <h4 key={lineIdx} className="text-sm font-bold text-[#fafafa] mt-3 mb-1.5 flex items-center gap-1.5 leading-snug">
          {parseInlineText(line.substring(4))}
        </h4>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={lineIdx} className="text-base font-bold text-[#ffffff] mt-4 mb-2 flex items-center gap-1.5 leading-snug">
          {parseInlineText(line.substring(3))}
        </h3>
      );
    }

    // 3. Bullet list items (- or *)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <ul key={lineIdx} className="list-disc list-inside ml-2.5 my-1 text-xs text-[#d1d1d1] leading-relaxed">
          <li className="pl-1">
            {parseInlineText(line.substring(2))}
          </li>
        </ul>
      );
    }

    // 4. Numbered list items (e.g. 1. 2.)
    const numberListMatch = line.match(/^\d+\.\s(.*)/);
    if (numberListMatch) {
      return (
        <ol key={lineIdx} className="list-decimal list-inside ml-2.5 my-1 text-xs text-[#d1d1d1] leading-relaxed">
          <li className="pl-1">
            {parseInlineText(numberListMatch[1])}
          </li>
        </ol>
      );
    }

    // Default: blank line vs paragraph
    if (line.trim() === '') {
      return <div key={lineIdx} className="h-2.5" />;
    }

    return (
      <p key={lineIdx} className="text-xs text-[#d1d1d1] leading-relaxed mb-1.5">
        {parseInlineText(line)}
      </p>
    );
  });
}

// Inner parser tool to style bolding (`**`) and inline code markers (`\``)
function parseInlineText(rawText: string) {
  const parts: (string | React.ReactNode)[] = [];
  let buffer = '';
  let i = 0;

  while (i < rawText.length) {
    // Check for bold notation
    if (rawText.substring(i, i + 2) === '**') {
      if (buffer) {
        parts.push(buffer);
        buffer = '';
      }
      i += 2;
      let boldBuffer = '';
      while (i < rawText.length && rawText.substring(i, i + 2) !== '**') {
        boldBuffer += rawText[i];
        i++;
      }
      i += 2; // skip closing **
      parts.push(
        <strong key={`b-${i}`} className="font-bold text-[#ffffff] font-sans">
          {boldBuffer}
        </strong>
      );
      continue;
    }

    // Check for inline code backticks
    if (rawText[i] === '`') {
      if (buffer) {
        parts.push(buffer);
        buffer = '';
      }
      i++;
      let codeBuffer = '';
      while (i < rawText.length && rawText[i] !== '`') {
        codeBuffer += rawText[i];
        i++;
      }
      i++; // skip closing backtick
      parts.push(
        <code key={`c-${i}`} className="font-mono text-[11px] bg-[#222222] border border-[#333] px-1.5 py-0.5 rounded text-violet-300">
          {codeBuffer}
        </code>
      );
      continue;
    }

    buffer += rawText[i];
    i++;
  }

  if (buffer) {
    parts.push(buffer);
  }

  return parts.length > 0 ? parts : rawText;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full flex-col gap-1.5 py-2.5 animate-fade-in ${
        isUser ? 'items-end' : 'items-start'
      }`}
      id={`message-${message.id}`}
    >
      {/* Sender Header */}
      <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-[#888888] select-none">
        {isUser ? (
          <>
            <span>USER SESSION LOG</span>
            <div className="w-4 h-4 rounded-full bg-[#333333] flex items-center justify-center text-white text-[8px] font-bold">
              <User size={10} />
            </div>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full bg-violet-900 border border-violet-500/35 flex items-center justify-center text-white text-[8px] font-bold">
              A
            </div>
            <span>AGENTIC QA PIPELINE</span>
          </>
        )}
      </div>

      <div className="w-full max-w-[85%] md:max-w-[78%]">
        {/* If assistant: show ReasoningTrace BEFORE the actual formatted text answer */}
        {!isUser && message.reasoningSteps && (
          <ReasoningTrace steps={message.reasoningSteps} />
        )}

        {/* Message Bubble Card */}
        <div
          className={`relative rounded-xl px-4 py-3.5 border transition-all duration-150 shadow-md ${
            isUser
              ? 'bg-[#7c3aed] border-[#8b5cf6]/40 text-white rounded-tr-none shadow-violet-950/20'
              : 'bg-[#151515] border-[#252525] text-[#e0e0e0] rounded-tl-none ring-1 ring-black/30 shadow-black/40'
          }`}
          id={`bubble-box-${message.id}`}
        >
          {/* Main Answer text */}
          <div className="break-words space-y-1">
            {isUser ? (
              <p className="text-xs leading-relaxed text-[#ffffff] font-medium selection:bg-violet-900">{message.content}</p>
            ) : (
              <div className="prose prose-invert max-w-none text-xs">
                {formatMarkdownContent(message.content)}
              </div>
            )}

            {/* Blinking Cursor when streaming */}
            {!isUser && message.isStreaming && (
              <span className="inline-flex ml-1 w-1.5 h-3.5 bg-green-400 animate-pulse self-center" />
            )}
          </div>

          {/* Sources beneath answer */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <SourcesList sources={message.sources} />
          )}

          {/* Core Latency/Tokens/Cost Metadata StatsRow */}
          {!isUser && message.metadata && (
            <StatsBar metadata={message.metadata} />
          )}
        </div>
      </div>
    </div>
  );
}
