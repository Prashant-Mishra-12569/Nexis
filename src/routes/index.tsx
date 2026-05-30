import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Wallet, Sparkles, Layers, Heart, Rocket, LogOut } from "lucide-react";
import { Orbs } from "@/components/nexis/Orbs";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNexisData } from "@/hooks/useNexisData";

export const Route = createFileRoute("/")({
  component: Landing,
});

const phrases = ["Build.", "Match.", "Fund.", "Ship."];

function Landing() {
  const [text, setText] = useState("");
  const [pi, setPi] = useState(0);
  const { isAuthenticated, isLoading, walletAddress, balance, login, logout } = useAuth();
  const { myProfile: profile } = useNexisData();
  const launchPath = profile?.role === "builder" ? "/dashboard" : "/feed";

  useEffect(() => {
    const word = phrases[pi];
    let i = 0;
    const id = setInterval(() => {
      i++;
      setText(word.slice(0, i));
      if (i >= word.length) {
        clearInterval(id);
        setTimeout(() => setPi((p) => (p + 1) % phrases.length), 1400);
      }
    }, 80);
    return () => clearInterval(id);
  }, [pi]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-transparent">
      <Orbs />

      {/* Nav - Glassmorphic Floating Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">
        <header className="flex items-center justify-between border border-white/10 bg-white/5 backdrop-blur-md rounded-full px-6 py-3.5 shadow-2xl">
          <div className="flex items-center gap-2.5">
            {/* Nexis Custom Logo (N icon) */}
            <svg className="h-6 w-6 text-[#00ff9d] drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16L20 4v16" />
            </svg>
            <span className="font-display text-xl font-black tracking-tight text-white">Nexis</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#how-it-works" className="hover:text-[#00ff9d] transition-colors cursor-pointer">
              How it works
            </a>
            <Link to="/onboarding" search={{}} className="hover:text-[#00ff9d] transition-colors">
              For Builders
            </Link>
            <Link to="/feed" className="hover:text-[#00ff9d] transition-colors">
              For Investors
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="glass rounded-full px-3 py-1 text-xs text-white/80 hidden sm:block">
                  <span className="text-[#00ff9d] font-bold">{balance || "0 MNT"}</span>
                </div>
                <div className="glass rounded-full px-3 py-1 text-xs font-mono text-white/80 hidden sm:block">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </div>
                <Link
                  to={launchPath}
                  className="px-5.5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-[#00ff9d] hover:from-emerald-400 hover:to-[#00ff9d] text-black font-extrabold text-[11px] shadow-[0_0_20px_rgba(0,255,157,0.25)] hover:shadow-[0_0_25px_rgba(0,255,157,0.4)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] tracking-wider uppercase"
                >
                  Launch App
                </Link>
                <button
                  onClick={() => logout()}
                  className="h-8 w-8 rounded-full glass grid place-content-center hover:neon-border transition-all text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => login()}
                  disabled={isLoading}
                  className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full border border-[#00ff9d]/30 text-white text-xs font-semibold hover:bg-[#00ff9d]/10 hover:border-[#00ff9d]/50 transition-all disabled:opacity-50"
                >
                  <Wallet className="h-3.5 w-3.5" /> {isLoading ? "Loading..." : "Connect"}
                </button>
                <Link
                  to={launchPath}
                  className="px-5.5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-[#00ff9d] hover:from-emerald-400 hover:to-[#00ff9d] text-black font-extrabold text-[11px] shadow-[0_0_20px_rgba(0,255,157,0.25)] hover:shadow-[0_0_25px_rgba(0,255,157,0.4)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] tracking-wider uppercase"
                >
                  Launch App
                </Link>
              </>
            )}
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 px-6 md:px-12 pt-16 md:pt-24 pb-24 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-white/90 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff9d]" />
          </span>
          Live on Mantle Testnet - Season 01
        </motion.div>

        <h1 className="font-display font-bold tracking-tighter leading-[1.05] text-[12vw] sm:text-7xl md:text-8xl lg:text-[100px] text-white">
          Swipe. Match.
          <br />
          <span className="text-[#00ff9d] relative inline-block drop-shadow-[0_0_25px_rgba(0,255,157,0.55)] font-black">
            {text}
          </span>
        </h1>

        <p className="mt-8 text-base md:text-lg text-[#8e9f97] max-w-2xl mx-auto leading-relaxed font-medium">
          The onchain matchmaking engine where world class founders meet conviction capital in a
          single swipe.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={launchPath}
            data-testid="landing-launch-app-btn"
            className="flex items-center gap-2 px-9 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-[#00ff9d] hover:from-emerald-400 hover:to-[#00ff9d] text-black font-black shadow-[0_0_35px_rgba(0,255,157,0.35)] hover:shadow-[0_0_45px_rgba(0,255,157,0.5)] transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] tracking-wider uppercase text-sm"
          >
            Launch App{" "}
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
          <Link
            to="/onboarding"
            search={{}}
            data-testid="landing-builder-btn"
            className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-[#00ff9d]/30 text-white font-semibold hover:border-[#00ff9d]/80 hover:bg-[#00ff9d]/5 transition-all duration-300"
          >
            I'm a builder
          </Link>
        </div>

        {/* Stats */}
        <StatsSection />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 px-6 md:px-12 pb-32 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-[#00ff9d] mb-4 font-bold">
            Dynamic Protocol Workflow
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Three steps to conviction capital.
          </h2>
          <p className="mt-4 text-white/50 text-sm md:text-base max-w-xl mx-auto">
            Nexis eliminates the middleman. Create, discover, match and fund in a streamlined, secure environment.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto scrollbar-hide pb-6 px-1 snap-x snap-mandatory">
          {/* Bento Card 1: Create Profile (Col Span 2) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bento-card p-8 md:col-span-2 flex flex-col justify-between group min-h-[360px] shrink-0 w-[85%] md:w-auto snap-start"
          >
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
              <div className="max-w-md">
                <div className="h-12 w-12 rounded-2xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mb-6">
                  <Sparkles className="h-6 w-6 text-[#00ff9d]" />
                </div>
                <h3 className="font-display font-black text-2xl mb-3 text-white">Create On-Chain Credentials</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Builders upload a 60-second pitch video and input core metrics. Investors set target tickets and industries to feed the real-time match engine.
                </p>
              </div>

              {/* Graphical Simulation of a profile widget */}
              <div className="w-full md:w-64 border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-2xl p-4 shadow-xl select-none group-hover:border-[#00ff9d]/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00ff9d] to-emerald-700 grid place-content-center text-xs font-black text-black">
                    NX
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Nexis Labs</div>
                    <div className="text-[10px] text-white/50">Mantle ecosystem</div>
                  </div>
                  <span className="ml-auto text-[9px] font-bold text-[#00ff9d] bg-[#00ff9d]/10 px-2 py-0.5 rounded-full border border-[#00ff9d]/20">
                    SaaS
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="text-[9px] text-white/40 uppercase font-black">Startup Ask</div>
                  <div className="text-sm font-bold text-white mt-0.5">$750K Seeking</div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#00ff9d] font-bold">
                  <Zap className="h-3 w-3 animate-pulse" /> Verified On-Chain Rep: 98%
                </div>
              </div>
            </div>
            <div className="text-[11px] text-white/40 uppercase tracking-widest font-black border-t border-white/5 pt-4 mt-6">
              Step 01 // Authentication & Identity
            </div>
          </motion.div>

          {/* Bento Card 2: Discover (Col Span 1) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bento-card p-8 md:col-span-1 flex flex-col justify-between group min-h-[360px] shrink-0 w-[85%] md:w-auto snap-start"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mb-6">
                <Layers className="h-6 w-6 text-[#00ff9d]" />
              </div>
              <h3 className="font-display font-black text-2xl mb-3 text-white">Sleek Swipe Discovery</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Swipe left to decline, right to match, or bookmark for later. Filter by reputation, ask size, and traction.
              </p>
            </div>

            {/* Overlapping Card stack visualization */}
            <div className="relative h-20 mt-6 select-none">
              <div className="absolute top-4 left-4 right-4 h-12 bg-white/[0.01] border border-white/5 rounded-xl rotate-3" />
              <div className="absolute top-2 left-2 right-2 h-12 bg-white/[0.02] border border-white/10 rounded-xl -rotate-2" />
              <div className="absolute inset-x-0 top-0 h-12 bg-[#090b0a] border border-[#00ff9d]/20 rounded-xl flex items-center px-4 justify-between shadow-lg">
                <span className="text-xs font-semibold text-white truncate max-w-[120px]">Decentralized AI</span>
                <span className="text-[9px] font-bold bg-[#00ff9d] text-black px-2 py-0.5 rounded-full uppercase tracking-wider">Swipe Feed</span>
              </div>
            </div>

            <div className="text-[11px] text-white/40 uppercase tracking-widest font-black border-t border-white/5 pt-4 mt-6">
              Step 02 // Precision Discovery
            </div>
          </motion.div>

          {/* Bento Card 3: Reputation (Col Span 1) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bento-card p-8 md:col-span-1 flex flex-col justify-between group min-h-[360px] shrink-0 w-[85%] md:w-auto snap-start"
          >
            <div>
              <div className="h-12 w-12 rounded-2xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mb-6">
                <Rocket className="h-6 w-6 text-[#00ff9d]" />
              </div>
              <h3 className="font-display font-black text-2xl mb-3 text-white">Proof of Reputation</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Our reputation oracle aggregates on-chain metrics, github telemetry, and investor sentiment to compute dynamic rankings.
              </p>
            </div>

            {/* Micro Graph / Telemetry representation */}
            <div className="flex items-end justify-between gap-1.5 h-16 mt-6 px-4 select-none">
              <div className="w-full bg-white/5 rounded-t-md h-8 group-hover:bg-[#00ff9d]/20 transition-all" />
              <div className="w-full bg-white/5 rounded-t-md h-12 group-hover:bg-[#00ff9d]/30 transition-all" />
              <div className="w-full bg-white/5 rounded-t-md h-6 group-hover:bg-[#00ff9d]/20 transition-all" />
              <div className="w-full bg-[#00ff9d]/30 border border-[#00ff9d]/50 rounded-t-md h-16 group-hover:shadow-[0_0_15px_rgba(0,255,157,0.3)] transition-all" />
              <div className="w-full bg-white/5 rounded-t-md h-10 group-hover:bg-[#00ff9d]/20 transition-all" />
            </div>

            <div className="text-[11px] text-white/40 uppercase tracking-widest font-black border-t border-white/5 pt-4 mt-6">
              Step 03 // Smart Telemetry
            </div>
          </motion.div>

          {/* Bento Card 4: Match & Fund (Col Span 2) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bento-card p-8 md:col-span-2 flex flex-col justify-between group min-h-[360px] shrink-0 w-[85%] md:w-auto snap-start"
          >
            <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
              <div className="max-w-md">
                <div className="h-12 w-12 rounded-2xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mb-6">
                  <Heart className="h-6 w-6 text-[#00ff9d]" />
                </div>
                <h3 className="font-display font-black text-2xl mb-3 text-white">E2E Messaging & Soulbound NFTs</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Mutual matches unlock highly-secure XMTP chat. Confirm deal milestones, sign contracts, and mint an immutable custom digital certificate representing proof-of-funding.
                </p>
              </div>

              {/* Chat bubble simulation */}
              <div className="w-full md:w-64 space-y-3 select-none">
                <div className="bg-white/5 rounded-2xl rounded-tr-none p-3 border border-white/10 max-w-[90%] ml-auto group-hover:border-[#00ff9d]/10 transition-colors">
                  <div className="text-[9px] text-[#00ff9d] font-bold">Investor (Closed Match)</div>
                  <p className="text-[11px] text-white/90 mt-1 font-medium">Terms approved. Let's mint the SBT.</p>
                </div>
                <div className="bg-[#00ff9d]/10 rounded-2xl rounded-tl-none p-3 border border-[#00ff9d]/20 max-w-[90%]">
                  <div className="text-[9px] text-[#00ff9d] font-black uppercase tracking-wider">Soulbound NFT Certificate</div>
                  <p className="text-[11px] text-white/95 mt-1 font-semibold">Deal Certified on Mantle</p>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-white/40 uppercase tracking-widest font-black border-t border-white/5 pt-4 mt-6">
              Step 04 // Capital Settlement & Proof
            </div>
          </motion.div>
        </div>

        <div className="mt-24 border border-white/[0.08] bg-[#090b0a]/65 backdrop-blur-xl rounded-3xl p-8 md:p-16 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Rocket className="h-10 w-10 text-[#00ff9d] mx-auto mb-5 drop-shadow-[0_0_10px_rgba(0,255,157,0.4)]" />
          <h3 className="font-display text-3xl md:text-5xl font-black text-white">Ready to discover startup synergy?</h3>
          <p className="text-white/50 text-sm md:text-base mt-4 max-w-xl mx-auto font-medium">
            Join the premium community of vetted builders and active angel/VC allocators. Setup your secure credentials in seconds.
          </p>
          <Link
            to={launchPath}
            data-testid="landing-cta-enter-btn"
            className="inline-flex items-center gap-2 mt-8 px-9 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-[#00ff9d] hover:from-emerald-400 hover:to-[#00ff9d] text-black font-black text-sm shadow-[0_0_35px_rgba(0,255,157,0.35)] hover:shadow-[0_0_45px_rgba(0,255,157,0.5)] transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer tracking-wider uppercase"
          >
            Enter Nexis Console <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-[#090b0a]/80 py-8 px-6 md:px-12 text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>© 2026 Nexis Labs. All rights reserved. Built for Next-Generation Capital Allocators.</div>
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff9d]" />
          </span>
          Built on Mantle Network
        </div>
      </footer>
    </div>
  );
}

function StatsSection() {
  const { ideas, matches } = useNexisData();
  const [stats, setStats] = useState({ ideas: 0, matches: 0, capital: 0 });

  useEffect(() => {
    // Sum capital across all ideas — accept $K and $M suffixes
    const totalCapital = ideas.reduce((acc, idea) => {
      const raw = idea.ask.replace(/[^0-9.]/g, "");
      const amount = parseFloat(raw) || 0;
      const multiplier = idea.ask.includes("M") ? 1_000_000 : idea.ask.includes("K") ? 1_000 : 1;
      return acc + amount * multiplier;
    }, 0);

    setStats({
      ideas: ideas.length,
      matches: matches.length,
      capital: totalCapital,
    });
  }, [ideas, matches]);

  const formatCapital = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n}`;
  };

  return (
    <div
      className="mt-20 flex sm:grid sm:grid-cols-3 max-w-4xl mx-auto gap-6 overflow-x-auto scrollbar-hide pb-4 px-1 snap-x snap-mandatory"
      data-testid="landing-stats"
    >
      <div className="bento-card p-6 flex flex-col justify-between min-h-[140px] shrink-0 w-[80%] sm:w-auto snap-start" data-testid="stat-active-ideas">
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold">Active Startups</div>
          <div className="font-display text-4xl md:text-5xl font-black text-[#00ff9d] mt-4 drop-shadow-[0_0_15px_rgba(0,255,157,0.35)]">
            {stats.ideas.toLocaleString()}
          </div>
        </div>
        <div className="text-[10px] text-white/30 text-left mt-4 flex items-center gap-1.5 border-t border-white/5 pt-2 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff9d]" /> Live idea telemetry
        </div>
      </div>
      
      <div className="bento-card p-6 flex flex-col justify-between min-h-[140px] shrink-0 w-[80%] sm:w-auto snap-start" data-testid="stat-deals-matched">
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold">Deals Matched</div>
          <div className="font-display text-4xl md:text-5xl font-black text-[#00ff9d] mt-4 drop-shadow-[0_0_15px_rgba(0,255,157,0.35)]">
            {stats.matches.toLocaleString()}
          </div>
        </div>
        <div className="text-[10px] text-white/30 text-left mt-4 flex items-center gap-1.5 border-t border-white/5 pt-2 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff9d] animate-pulse" /> Verified connection mesh
        </div>
      </div>
      
      <div className="bento-card p-6 flex flex-col justify-between min-h-[140px] shrink-0 w-[80%] sm:w-auto snap-start" data-testid="stat-capital-seeking">
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold">Capital Seeking</div>
          <div className="font-display text-4xl md:text-5xl font-black text-[#00ff9d] mt-4 drop-shadow-[0_0_15px_rgba(0,255,157,0.35)]">
            {formatCapital(stats.capital)}
          </div>
        </div>
        <div className="text-[10px] text-white/30 text-left mt-4 flex items-center gap-1.5 border-t border-white/5 pt-2 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff9d]" /> Dynamic liquidity volume
        </div>
      </div>
    </div>
  );
}
