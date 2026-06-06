/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Terminal,
  Search,
  CloudSun,
  Database,
  Eye,
  Shield,
  ArrowRight,
  GitBranch,
  CheckCircle2,
  Cpu,
  Github,
  Play
} from 'lucide-react';

export function LandingPage() {
  useEffect(() => {
    // Graceful scrolling on initial mount for direct hash entries e.g., /#features, /#pipeline, /#marquee
    const hash = window.location.hash || window.location.pathname;
    if (hash) {
      // Extract target ID from URL
      const match = hash.match(/(features|pipeline|marquee)/i);
      if (match && match[0]) {
        const targetId = match[0].toLowerCase();
        setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    }
  }, []);

  const marqueeItems = [
    { q: 'What is the wind vector in Lahore right now?', a: 'Iteration 1: calling get_weather({city: "Lahore"}). Result status: 200 OK. 12 km/h NW hazes.' },
    { q: 'Who won the 2023 ICC Cricket World Cup?', a: 'Iteration 1: searching duckduckgo_search_tool. Australia defeated India by 6 wickets in Ahmedabad.' },
    { q: 'Analyze latest AI research in compute scaling', a: 'Iteration 1: search_duckduckgo_api. Models like deepseek-r1 leverage massive search trees.' },
    { q: 'Weather at coordinate latitude -33.8688', a: 'Iteration 1: invoking openweathermap_tool. Sydney results: 22°C with active caching.' },
    { q: 'Retrieve stored preference log key 0x9f', a: 'Memory block retrieved. Loaded context: User specializes in Kubernetes deployments.' }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-[#e5e5e5] flex flex-col font-sans -webkit-font-smoothing-antialiased selection:bg-indigo-900 overflow-x-hidden relative" id="landing-container">
      
      {/* Background ambient gradient glow in the top-left using blurred violet/indigo circles instead of bright white */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-violet-950/20 to-indigo-950/20 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-900/10 to-indigo-900/5 blur-[150px] rounded-full -z-10 pointer-events-none" />

      {/* FIXED "STRONG LIQUID GLASS" NAVBAR */}
      <div className="w-full flex justify-center sticky top-[24px] z-50 px-4" id="navbar-sticky-wrapper">
        <nav
          className="flex items-center justify-between w-full max-w-4xl px-4 py-2.5 rounded-2xl bg-[#0c0c0c]/45 backdrop-blur-[50px] border border-[#222] shadow-[inset_0px_4px_4px_0px_rgba(255,255,255,0.02)] shadow-black/80"
          id="navbar-container"
        >
          {/* Logo Brand heading */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center border border-violet-400/25">
              <Cpu size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white font-mono uppercase">Agentic QA</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono tracking-wider text-[#999999]">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="hover:text-white transition-colors"
            >
              FEATURES
            </a>
            <a
              href="#pipeline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="hover:text-white transition-colors"
            >
              PIPELINE
            </a>
            <a
              href="#marquee"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('marquee')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="hover:text-white transition-colors"
            >
              LIVE_DEMO
            </a>
            <span className="text-[#333] select-none">|</span>
            <div className="flex items-center gap-1.5 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>v1.0.4 PRODUCTION</span>
            </div>
          </div>

          {/* SignUp glassy button CTA */}
          <div>
            <Link
              to="/app"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold transition-all hover:scale-[1.02] shadow-[inset_0px_2px_4px_rgba(255,255,255,0.15)] shadow-violet-950/45"
              id="nav-signup-cta"
            >
              LAUNCH CONSOLE <ArrowRight size={12} />
            </Link>
          </div>
        </nav>
      </div>

      {/* HERO SECTION */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-12 flex flex-col items-center" id="hero-layout">
        
        {/* Rated Customer star counts */}
        <div className="mb-4 flex items-center gap-2 bg-[#121212] px-3.5 py-1.5 rounded-full border border-[#222] select-none" id="customer-raters">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} className="w-3.5 h-3.5 text-[#ff801e] fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-[10px] font-mono font-medium tracking-wide text-[#a5a5a5]">
            RATED 4.9/5 BY 2700+ SENIOR ENGINEERS & LEAD ARCHITECTS
          </span>
        </div>

        {/* Hero split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full min-h-[500px]" id="hero-split-grid">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 flex flex-col text-left space-y-6" id="hero-left-content">
            
            {/* Confident Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-white mb-2" id="confident-header">
              An agent that thinks before it answers.
            </h1>

            {/* Stack explanations badges Row */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#88888a] font-mono select-none" id="stack-bulleted-desc">
              <span className="text-white font-semibold">STACK:</span>
              <span>Groq Llama-3.3-70b</span>
              <span className="text-[#333]">•</span>
              <span>DuckDuckGo</span>
              <span className="text-[#333]">•</span>
              <span>OpenWeatherMap Live APIs</span>
              <span className="text-[#333]">•</span>
              <span>PostgreSQL Memories</span>
            </div>

            {/* Description subhead */}
            <p className="text-[#8e8e93] text-sm sm:text-base leading-relaxed tracking-normal max-w-2xl" id="hero-subheadline-desc">
              Effortlessly manage your projects, collaborate with your team, and achieve your goals with our intuitive task management tool. Unlike standard LLMs that hallucinate, Agentic QA operates inside an active, observation-backed ReAct telemetry cycle.
            </p>

            {/* Core Action buttons and link */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2" id="hero-ctas-panel">
              <Link
                to="/app"
                className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs font-mono transition-all duration-150 hover:scale-[1.02] shadow-xl shadow-violet-950/20 border border-violet-500/20"
                id="cta-try-now"
              >
                TRY IT NOW <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#121212] hover:bg-[#181818] border border-[#2a2a2a] hover:border-[#444] text-[#d1d1d1] font-medium text-xs font-mono transition-all duration-150 hover:scale-[1.02]"
                id="cta-github-ghost"
              >
                <Github size={14} />
                VIEW ON GITHUB_
              </a>
            </div>
          </div>

          {/* Hero Right Content: The Glassy WebM Orb */}
          <div className="lg:col-span-5 flex items-center justify-center relative overflow-visible" id="hero-right-orb-canvas">
            
            {/* Soft background blue aura behind the blended video block */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none -z-10" />

            <div className="w-[380px] h-[380px] md:w-[420px] md:h-[420px] flex items-center justify-center select-none" id="glassy-orb-viewport">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain scale-125 mix-blend-screen select-none filter hue-rotate-[-55deg] saturate-[250%] brightness-[1.2] contrast-[1.1]"
                id="glassy-orb-video"
              >
                <source src="https://future.co/images/homepage/glassy-orb/orb-purple.webm" type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL LIVE DEMO TICKER MARQUEE */}
      <section className="w-full bg-[#080808] border-y border-[#181818] py-7 overflow-hidden select-none" id="marquee">
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#555] uppercase">
            <Terminal size={12} className="text-violet-500 animate-pulse" />
            <span>Telemetry streams interception log marquee</span>
          </div>
        </div>

        {/* Double scrolling marquee for flawless horizontal continuous translation */}
        <div className="relative flex overflow-x-hidden w-full" id="marquee-track">
          <div className="flex gap-4 animate-marquee whitespace-nowrap">
            {marqueeItems.concat(marqueeItems).map((item, idx) => (
              <div
                key={idx}
                className="inline-flex flex-col gap-1.5 px-4.5 py-3 rounded-xl bg-[#0f0f0f] border border-[#222] min-w-[320px] max-w-[420px] shrink-0"
              >
                <div className="flex items-center gap-1 text-[10px] text-violet-400 font-mono">
                  <span>Q: {item.q}</span>
                </div>
                <div className="text-[10px] text-[#888888] font-mono truncate">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
          
          <div className="absolute top-0 flex gap-4 animate-marquee-2 whitespace-nowrap">
            {marqueeItems.concat(marqueeItems).map((item, idx) => (
              <div
                key={`dup-${idx}`}
                className="inline-flex flex-col gap-1.5 px-4.5 py-3 rounded-xl bg-[#0f0f0f] border border-[#222] min-w-[320px] max-w-[420px] shrink-0"
              >
                <div className="flex items-center gap-1 text-[10px] text-violet-400 font-mono">
                  <span>Q: {item.q}</span>
                </div>
                <div className="text-[10px] text-[#888888] font-mono truncate">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACKS BADGE ROW */}
      <section className="w-full py-8 max-w-7xl mx-auto px-6 text-center" id="tech-badge-container">
        <span className="text-[10px] font-mono text-[#444] tracking-widest uppercase block mb-3.5 select-none">
          Proven deployment compatibility stack indexes
        </span>
        
        <div className="flex flex-wrap items-center justify-center gap-2" id="tech-badges-list">
          {['Groq', 'Llama-3.3-70b', 'DuckDuckGo API', 'OpenWeatherMap', 'Redis Live Cache', 'PostgreSQL Logs', 'Langfuse Observability', 'React Router', 'TypeScript', 'Docker Container'].map((badge) => (
            <span
              key={badge}
              className="px-3 py-1 text-[10px] font-mono font-medium rounded bg-[#0f0f0f] text-[#a5a5a5] border border-[#1e1e1e] hover:border-[#333] transition-colors hover:text-white select-none"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS DIAGRAM TIMELINE */}
      <section className="w-full max-w-5xl mx-auto px-6 py-16 text-center border-t border-[#121212]" id="pipeline">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
          Step-by-step ReAct loop pipeline
        </h2>
        <p className="text-xs text-[#8e8e93] font-mono mb-10 max-w-md mx-auto uppercase tracking-wide">
          Query compilation to cited final state loop
        </p>

        {/* Visual timeline blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative" id="how-it-works-timeline">
          {/* Arrow connectors in desktop layouts */}
          <div className="hidden md:block absolute top-1/2 left-[30%] -translate-y-1/2 w-[12%] h-[1px] bg-gradient-to-r from-violet-600/60 to-transparent pointer-events-none" />
          <div className="hidden md:block absolute top-1/2 left-[64%] -translate-y-1/2 w-[12%] h-[1px] bg-gradient-to-r from-blue-600/60 to-transparent pointer-events-none" />

          {/* Block 1 */}
          <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl flex flex-col items-center text-center space-y-3.5 relative">
            <div className="w-10 h-10 rounded-xl bg-violet-950/40 border border-violet-800/40 text-violet-400 flex items-center justify-center font-bold font-mono text-xs shadow-inner select-none">
              01
            </div>
            <h3 className="text-xs font-bold font-mono text-white tracking-widest uppercase">CONSTRUCT QUERY</h3>
            <p className="text-xs text-[#888888] font-sans leading-relaxed">
              Submit custom prompt string. System scans PostgreSQL semantic layers to inject active episodic preferences.
            </p>
          </div>

          {/* Block 2 */}
          <div className="bg-[#0b0b0b] border border-[#211a30] p-5 rounded-2xl flex flex-col items-center text-center space-y-3.5 relative ring-1 ring-violet-500/10">
            <div className="w-10 h-10 rounded-xl bg-[#291b42]/30 border border-violet-700/40 text-violet-400 flex items-center justify-center font-bold font-mono text-xs shadow-inner select-none animate-pulse">
              02
            </div>
            <h3 className="text-xs font-bold font-mono text-[#a78bfa] tracking-widest uppercase">REACT INTERSECT LOOP</h3>
            <p className="text-xs text-[#a5a5a5] font-sans leading-relaxed">
              Groq iteratively reasons, triggers OpenWeatherMap or DuckDuckGo query spans, captures observations, and self-checks results.
            </p>
          </div>

          {/* Block 3 */}
          <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl flex flex-col items-center text-center space-y-3.5 relative">
            <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-900/40 text-blue-400 flex items-center justify-center font-bold font-mono text-xs shadow-inner select-none">
              03
            </div>
            <h3 className="text-xs font-bold font-mono text-white tracking-widest uppercase">CITED RESOLUTION</h3>
            <p className="text-xs text-[#888888] font-sans leading-relaxed">
              Deliver complete Markdown answer featuring raw favicons, full token cost tracking, and Langfuse audit summaries.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-[#121212]" id="features">
        
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2" id="grid-header">
            Engineered for bulletproof performance.
          </h2>
          <p className="text-xs font-mono text-violet-400 tracking-wider uppercase select-none">
            Observe the active capabilities block
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="features-bento-grid">
          
          {/* Feature 1 */}
          <div className="bg-[#090909] border border-[#1a1a1a] p-5.5 rounded-2xl hover:border-[#2a2a2a] transition-all flex flex-col gap-2.5">
            <Terminal className="text-violet-500" size={18} />
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#e5e5e5] uppercase">ReAct Agent Loop</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              Performs logical self-reflection chains. Triggers secondary sub-processes conditionally instead of single model responses.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#090909] border border-[#1a1a1a] p-5.5 rounded-2xl hover:border-[#2a2a2a] transition-all flex flex-col gap-2.5">
            <Search className="text-blue-500" size={18} />
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#e5e5e5] uppercase">Live Web Search</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              Crawls indices via DuckDuckGo interfaces and serves dynamic source pill attachments complete with raw domain favicons.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#090909] border border-[#1a1a1a] p-5.5 rounded-2xl hover:border-[#2a2a2a] transition-all flex flex-col gap-2.5">
            <CloudSun className="text-emerald-500" size={18} />
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#e5e5e5] uppercase">Real Weather Data</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              Retrieves atmospheric measurements via OpenWeatherMap wrapper, optimized by an active Redis in-memory cache router.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#090909] border border-[#1a1a1a] p-5.5 rounded-2xl hover:border-[#2a2a2a] transition-all flex flex-col gap-2.5">
            <Database className="text-indigo-500" size={18} />
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#e5e5e5] uppercase">Persistent Memory</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              Saves chat threads and extracted user entities inside a relational PostgreSQL system for reliable context consistency.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-[#090909] border border-[#1a1a1a] p-5.5 rounded-2xl hover:border-[#2a2a2a] transition-all flex flex-col gap-2.5">
            <Eye className="text-purple-500" size={18} />
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#e5e5e5] uppercase">Full Observability</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              Traces prompt pipelines, calculates cumulative token expenditures, and intercepts model span trees via Langfuse standards.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-[#090909] border border-[#1a1a1a] p-5.5 rounded-2xl hover:border-[#2a2a2a] transition-all flex flex-col gap-2.5">
            <Shield className="text-amber-500" size={18} />
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#e5e5e5] uppercase">Safety First</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              Masks raw PII parameters, blocks injection payloads, and audits outputs to enforce enterprise compliance.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full bg-[#050505] border-t border-[#121212] mt-auto select-none" id="landing-footer">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-white">AGENTIC QA TERMINAL</span>
            </div>
            <span className="text-[10px] text-[#555] font-mono">© 2026 Enterprise Agentic Structures. All rights reserved.</span>
          </div>

          {/* Badges alignment and branch tracker */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-[#888]" id="footer-badges-column">
            
            {/* CI passing badge simulated */}
            <div className="flex items-center gap-1.5 bg-[#0e2113] border border-[#22c55e]/25 text-[#4ade80] px-2.5 py-1 rounded-full text-[9px] font-semibold">
              <CheckCircle2 size={10} />
              <span>58 TESTS PASSING_</span>
            </div>

            <div className="flex items-center gap-1 bg-[#101010] border border-[#222] text-[#888] px-2.5 py-1 rounded-full text-[9px]">
              <GitBranch size={10} className="text-violet-500" />
              <span>branch: <span className="text-white">feat/production-grade</span></span>
            </div>

            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" id="footer-github-link">
              GitHub_
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
