/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { useStreamingQuery, deleteMemoryById } from '../hooks/useStreamingQuery';
import type { Message, Session, Memory } from '../types';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { SessionIntelligence } from '../components/SessionIntelligence';
import {
  Plus,
  Compass,
  CornerDownRight,
  TrendingUp,
  SidebarClose,
  SidebarOpen,
  Menu,
  Activity,
  ArrowLeft,
  Settings,
  X,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppPage() {
  // 1. Core Reactive States
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [evaluateEnabled, setEvaluateEnabled] = useState<boolean>(true);

  // Layout UI Toggles
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook activation
  const { isStreaming, startStream, activeTrace, setActiveTrace } = useStreamingQuery();

  const STORAGE_KEY = 'agenticqa_sessions';
  const ACTIVE_KEY = 'agenticqa_active_session';

  // Load sessions from localStorage on mount, or create a fresh one
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const savedActive = localStorage.getItem(ACTIVE_KEY);
      if (saved) {
        const parsed: Session[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(savedActive && parsed.find(s => s.id === savedActive) ? savedActive : parsed[0].id);
          return;
        }
      }
    } catch { /* ignore parse errors */ }

    // No saved sessions — create fresh one
    const initialId = 'session_' + Math.random().toString(36).substring(2, 8);
    const fresh: Session[] = [{
      id: initialId,
      sessionId: crypto.randomUUID(),
      title: 'New Investigation',
      timestamp: new Date().toISOString(),
      messages: [],
    }];
    setSessions(fresh);
    setActiveSessionId(initialId);
  }, []);

  // Persist sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } catch { /* storage full — ignore */ }
    }
  }, [sessions]);

  // Persist active session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  // Load real memories from backend when active session changes
  useEffect(() => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session?.sessionId) return;
    setMemories([]);
    fetch(`/memory/${encodeURIComponent(session.sessionId)}`)
      .then(r => r.ok ? r.json() : { memories: [] })
      .then(data => {
        if (data.memories?.length > 0) {
          setMemories(data.memories.map((m: { id: string; content: string; type: 'episodic' | 'semantic' | 'preference'; created_at: string }) => ({
            id: m.id, content: m.content, type: m.type, timestamp: m.created_at,
          })));
        }
      })
      .catch(() => {});
  }, [activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Auto-scroll screen details to bottom when streaming values update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length, isStreaming]);

  // Handler: Invoke streaming cycle
  const handleQuerySubmit = async (queryText: string) => {
    if (!activeSessionId || !activeSession || isStreaming) return;

    setActiveTrace(null);

    // Auto-title session from first user message
    const isFirstMessage = activeSession.messages.length === 0;
    const sessionToUse = isFirstMessage
      ? { ...activeSession, title: queryText.length > 40 ? queryText.slice(0, 40) + '…' : queryText }
      : activeSession;

    if (isFirstMessage) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? sessionToUse : s));
    }

    await startStream(
      queryText,
      sessionToUse,
      (updatedSession) => {
        setSessions((prev) =>
          prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
        );
      },
      setMemories,
      evaluateEnabled
    );
  };

  // Handler: Instantiate clean chat sessions
  const createNewSession = () => {
    if (isStreaming) return;
    const newId = 'session_' + Math.random().toString(36).substring(2, 8);
    const newSession: Session = {
      id: newId,
      sessionId: crypto.randomUUID(),
      title: 'New Investigation',
      timestamp: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMemories([]);
    setMobileMenuOpen(false);
  };

  // Handler: Forget single memory — calls real DELETE endpoint then removes locally
  const handleForgetMemory = async (id: string) => {
    if (activeSession?.sessionId) {
      await deleteMemoryById(activeSession.sessionId, id);
    }
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Suggested quick prompts click action handler
  const handleSuggestedPromptClick = (text: string) => {
    handleQuerySubmit(text);
  };

  const currentLastMessage = activeSession?.messages[activeSession.messages.length - 1];
  const lastResponseEval = currentLastMessage?.role === 'assistant' ? currentLastMessage.evalScores : undefined;

  return (
    <div className="h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col overflow-hidden font-sans select-none" id="app-workspace">
      
      {/* MOBILE RESPONSIVE OPTIMIZATION BAR */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-[#111111] border-b border-[#222222] select-none" id="mobile-workspace-header">
        <div className="flex items-center gap-2">
          <Link to="/" className="p-1 hover:bg-[#1a1a1a] rounded text-[#888] hover:text-white transition-colors" id="m-back-home">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-xs font-bold font-mono tracking-widest text-[#e5e5e5] uppercase">AGENTIC_QA Console</span>
        </div>

        <div className="flex items-center gap-2" id="mobile-toggles">
          {/* Quick Memory/Trace button tab for mobile */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`p-1.5 rounded border border-[#2e2e2e] transition-all cursor-pointer ${
              rightPanelOpen ? 'bg-[#7c3aed] text-white' : 'bg-[#151515] text-[#888]'
            }`}
            title="Toggle Session Intelligence"
            id="mobile-intelligence-toggle"
          >
            <Activity size={16} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-[#151515] hover:bg-[#222] text-[#888] rounded border border-[#2e2e2e] cursor-pointer"
            id="mobile-drawer-toggle"
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR COL 1 (LEFT SIDEBAR): Historical lists & controllers */}
        <aside
          className={`flex-shrink-0 w-[240px] bg-[#111111] border-r border-[#222222] flex flex-col justify-between transition-all duration-200 z-30 absolute md:relative h-full ${
            leftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden md:w-0'
          }`}
          id="left-history-sidebar"
        >
          {/* Top sections: Wordmark & create action */}
          <div className="flex flex-col overflow-hidden flex-1 p-3.5 space-y-4">
            
            {/* Console Logo */}
            <div className="flex items-center justify-between pb-1 select-none">
              <Link to="/" className="flex items-center gap-2 group" id="brand-logo-app">
                <div className="w-5.5 h-5.5 rounded-lg bg-violet-600 border border-violet-400/25 flex items-center justify-center text-white">
                  <Activity size={12} className="group-hover:animate-spin" />
                </div>
                <span className="text-[11px] font-bold font-mono text-[#ffffff] tracking-widest uppercase">
                  AGENTIC QA
                </span>
              </Link>
              
              <button
                onClick={() => setLeftSidebarOpen(false)}
                className="hidden md:block p-1 hover:bg-[#1f1f1f] rounded text-[#555] hover:text-white transition-colors cursor-pointer"
                title="Collapse sidebar console"
                id="collapse-sidebar-button"
              >
                <SidebarClose size={14} />
              </button>
            </div>

            {/* Instantiation controller */}
            <button
              onClick={createNewSession}
              disabled={isStreaming}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                isStreaming
                  ? 'bg-[#151515] border border-[#222] text-[#555] cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg cursor-pointer shadow-violet-950/20 hover:scale-[1.01]'
              }`}
              id="instantiate-new-session"
            >
              <Plus size={14} /> NEW SESSION_
            </button>

            {/* Session Chronicles List */}
            <div className="flex-grow flex flex-col overflow-hidden space-y-1.5 pt-2">
              <span className="text-[9px] font-mono text-[#555] tracking-widest select-none uppercase">CONVERSATION LOG CHRONICLE</span>
              
              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1" id="session-scrollable-loglist">
                {sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <button
                      key={sess.id}
                      onClick={() => {
                        setActiveSessionId(sess.id);
                        if (mobileMenuOpen) setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition-all pointer flex flex-col gap-0.5 relative group ${
                        isActive
                          ? 'bg-[#161616] border-[#2a2a2a] text-white ring-1 ring-violet-500/10'
                          : 'bg-transparent border-transparent text-[#999] hover:text-[#e0e0e0] hover:bg-[#141414]'
                      }`}
                      id={`session-anchor-${sess.id}`}
                    >
                      <span className="text-[11px] font-sans font-medium truncate w-[190px]">
                        {sess.title}
                      </span>
                      <span className="text-[8px] font-mono text-[#555] uppercase">
                        {sess.id === 'session_core_8a91' ? 'ACTIVE_SESSION' : sess.id.split('_')[1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom stats status trackers */}
          <div className="p-3 bg-[#0c0c0c] border-t border-[#222222] space-y-2 select-none" id="sidebar-bottom-indicators">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#888888]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>llama-3.3-70b</span>
              </div>
              <span className="text-[#555]">LIVE</span>
            </div>

            <div className="text-[8px] font-mono text-[#555] flex items-center justify-between pt-1 border-t border-[#181818]">
              <span>ACTIVE_LATENCY_INDEX</span>
              <span className="text-violet-400 font-semibold uppercase">
                {currentLastMessage?.metadata ? `${(currentLastMessage.metadata.latencyMs / 1000).toFixed(2)}s` : '1.42s'}
              </span>
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR BOTTOM SLIDE DRAWER BACKDROP */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            onClick={() => setMobileMenuOpen(false)}
            id="mobile-drawer-backdrop"
          />
        )}

        {/* SIDEBAR COL 2 (MAIN CONSOLE): Active messages details */}
        <main className="flex-1 flex flex-col bg-[#0d0d0d] relative overflow-hidden" id="main-terminal-chat">
          
          {/* Header navigation with collapse toggles */}
          <div className="hidden md:flex items-center justify-between px-4 py-2 bg-[#0d0d0d] border-b border-[#181818]" id="main-header-toolbar">
            <div className="flex items-center gap-2">
              {!leftSidebarOpen && (
                <button
                  onClick={() => setLeftSidebarOpen(true)}
                  className="p-1 hover:bg-[#1a1a1a] rounded text-[#888] hover:text-white transition-colors cursor-pointer"
                  title="Expand historical archive list"
                  id="expand-sidebar-button"
                >
                  <SidebarOpen size={14} />
                </button>
              )}
              
              <Link to="/" className="flex items-center gap-1 text-[11px] font-mono text-[#666] hover:text-[#999] transition-colors" id="nav-back-command">
                <CornerDownRight size={11} /> 
                <span>ROOT_DIRECTORY</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#121212] px-2.5 py-1 rounded border border-[#222] text-[#888] font-mono">
                Observe Live Web & Weather Traces
              </span>

              {!rightPanelOpen && (
                <button
                  onClick={() => setRightPanelOpen(true)}
                  className="p-1 hover:bg-[#1a1a1a] rounded text-[#888] hover:text-white transition-all cursor-pointer"
                  title="Open live Session Intelligence panel"
                  id="expand-intelligence-button"
                >
                  <SidebarOpen size={14} className="rotate-180" />
                </button>
              )}
            </div>
          </div>

          {/* Conversational Screen logs layout */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar bg-[#0d0d0d]" id="terminal-scroller-canvas">
            
            {/* If empty states: show beautiful grid suggestions */}
            {(!activeSession || !activeSession.messages || activeSession.messages.length === 0) ? (
              <div className="h-full flex flex-col justify-center items-center max-w-xl mx-auto text-center space-y-7 py-8 animate-fade-in" id="empty-workspace-state">
                
                {/* Visual centered logo elements */}
                <div className="space-y-2.5">
                  <div className="w-11 h-11 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-full flex items-center justify-center border border-violet-400/25 shadow-xl shadow-violet-950/20 select-none mx-auto">
                    <Database size={20} className="text-white animate-pulse" />
                  </div>
                  <h2 className="text-base font-bold font-mono tracking-tight text-[#ffffff]">
                    ASK_ANYTHING_ABOUT_THE_WORLD
                  </h2>
                  <p className="text-xs text-[#8e8e93] leading-relaxed font-sans max-w-sm mx-auto">
                    Powered by a ReAct agent — I search, reason, and cite sources. Reviewers can click any suggested prompt chip below to initiate a live tracing pipeline.
                  </p>
                </div>

                {/* Grid suggested clicks chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full pt-1" id="quick-prompt-grid">
                  {[
                    { text: 'Weather in Lahore', icon: '☁️', desc: 'Queries OpenWeatherMap utilizing live parameters' },
                    { text: 'Latest AI research', icon: '🧠', desc: 'Invokes DuckDuckGo to extract academic papers' },
                    { text: 'What can you do?', icon: '🛡️', desc: 'Analyzes capabilities, Redis caches, and specs' },
                    { text: 'Who won the 2023 Cricket World Cup?', icon: '🏆', desc: 'Verifies real facts on external websites' }
                  ].map((chip) => (
                    <button
                      key={chip.text}
                      onClick={() => handleSuggestedPromptClick(chip.text)}
                      disabled={isStreaming}
                      className="text-left p-3 rounded-xl bg-[#121212]/50 hover:bg-[#141414] border border-[#1e1e1e] hover:border-violet-600/35 transition-all text-xs font-sans space-y-1 group hover:scale-[1.01] shadow-sm select-none cursor-pointer"
                      id={`preset-prompt-${chip.text.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm select-none">{chip.icon}</span>
                        <span className="font-bold text-[#fafafa] group-hover:text-violet-400 transition-colors">
                          {chip.text}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#666666] leading-snug font-mono select-none">
                        {chip.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat bubble rows map layout */
              <div className="max-w-3xl mx-auto w-full pb-8 divide-y divide-[#161616]/30" id="messages-mapping-suite">
                {activeSession.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                
                {/* Auto Scroll terminal Anchor point */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Under-Chat submission drawer elements layout */}
          <div className="px-4 border-t border-[#181818] bg-[#0d0d0d] z-15" id="input-chatbar-frame">
            <div className="max-w-3xl mx-auto w-full">
              <ChatInput
                onSend={handleQuerySubmit}
                isStreaming={isStreaming}
                activeSessionId={activeSessionId}
                evaluateEnabled={evaluateEnabled}
                setEvaluateEnabled={setEvaluateEnabled}
              />
            </div>
          </div>
        </main>

        {/* SIDEBAR COL 3 (RIGHT PANEL): Intelligence widgets panel */}
        {rightPanelOpen && (
          <aside
            className={`flex-shrink-0 w-full md:w-[320px] bg-[#0e0e0e] z-30 transition-all duration-200 absolute md:relative right-0 h-full ${
              rightPanelOpen ? 'translate-x-0' : 'translate-x-full md:hidden md:w-0'
            }`}
            id="right-intelligence-sidebar"
          >
            {/* Collapsed side close tool icon inside responsive screen sizes */}
            <div className="absolute top-2 w-full flex justify-end px-3 pt-1 select-none pointer-events-none md:hidden z-40">
              <button
                onClick={() => setRightPanelOpen(false)}
                className="pointer-events-auto p-1.5 bg-[#151515] border border-[#2e2e2e] text-[#888] rounded-full cursor-pointer"
                id="close-mobile-intelligence-panel"
              >
                <X size={14} />
              </button>
            </div>

            <SessionIntelligence
              memories={memories}
              onForgetMemory={handleForgetMemory}
              activeTrace={activeTrace}
              evaluateEnabled={evaluateEnabled}
              lastEval={lastResponseEval}
            />
          </aside>
        )}
      </div>

      {/* MOBILE CONSOLE BOTTOM DRAWER DRAWERDRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed bottom-12 left-0 right-0 max-h-[350px] bg-[#0c0c0c] border-t border-[#222] rounded-t-2xl z-50 p-4 overflow-y-auto" id="mobile-sidebar-drawer-slide">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#222]">
            <span className="text-[11px] font-bold font-mono tracking-wider text-[#a5a5a5]">Log Chronologies</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#666] hover:text-white"
              id="close-mobile-drawer-btn"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="py-3 space-y-2" id="mobile-session-nodes">
            {sessions.map((sess) => (
              <button
                key={`mob-${sess.id}`}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left p-3 rounded-xl border flex flex-col gap-1 ${
                  sess.id === activeSessionId
                    ? 'bg-violet-950/20 border-violet-800/60 text-white'
                    : 'bg-transparent border-transparent text-[#999]'
                }`}
                id={`mob-session-${sess.id}`}
              >
                <span className="text-xs font-semibold">{sess.title}</span>
                <span className="text-[9px] font-mono text-[#555] uppercase">{sess.id}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              createNewSession();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-3 mt-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold font-sans"
            id="mobile-new-session-cta"
          >
            <Plus size={14} /> NEW SESSION_
          </button>
        </div>
      )}
    </div>
  );
}
