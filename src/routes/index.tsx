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
    <div className="min-h-screen relative overflow-hidden">
      <Orbs />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[var(--neon)] grid place-content-center neon-glow">
            <Zap className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Nexis</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-white transition-colors cursor-pointer">
            How it works
          </a>
          <Link to="/onboarding" search={{}} className="hover:text-white transition-colors">
            For Builders
          </Link>
          <Link to="/feed" className="hover:text-white transition-colors">
            For Investors
          </Link>
        </nav>
        {isAuthenticated ? (
          <div className="hidden sm:flex items-center gap-3">
            <div className="glass rounded-full px-3 py-1.5 text-xs" data-testid="landing-balance">
              <span className="text-[var(--neon)]">{balance || "0 MNT"}</span>
            </div>
            <div
              className="glass rounded-full px-3 py-1.5 text-xs font-mono"
              data-testid="landing-wallet"
            >
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </div>
            <button
              onClick={() => logout()}
              data-testid="landing-logout-btn"
              aria-label="Disconnect wallet"
              className="h-8 w-8 rounded-full glass grid place-content-center hover:neon-border transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => login()}
            disabled={isLoading}
            data-testid="landing-connect-btn"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full glass hover:neon-border transition-all duration-300 text-sm disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" /> {isLoading ? "Loading..." : "Connect"}
          </button>
        )}
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-12 md:pt-20 pb-24 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon)] animate-pulse" />
          Live on Mantle Testnet • Season 01
        </motion.div>

        <h1 className="font-display font-bold tracking-tighter leading-[0.95] text-[14vw] sm:text-7xl md:text-8xl lg:text-9xl">
          Swipe. Match.
          <br />
          <span className="text-[var(--neon)] neon-text caret-blink">{text}</span>
        </h1>

        <p className="mt-8 text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The on-chain matchmaking engine where world-class founders meet conviction capital — in a
          single swipe.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/feed"
            data-testid="landing-launch-app-btn"
            className="group flex items-center gap-2 px-8 py-4 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Launch App{" "}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/onboarding"
            search={{}}
            data-testid="landing-builder-btn"
            className="flex items-center gap-2 px-8 py-4 rounded-full glass hover:neon-border transition-all duration-300"
          >
            I'm a builder
          </Link>
        </div>

        {/* Stats */}
        <StatsSection />
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 md:px-12 pb-32 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--neon)] mb-3">
            How it works
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold">Three taps to capital.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: Sparkles,
              t: "Create profile",
              d: "Builders post their idea with a 60-second pitch video. Investors set their thesis.",
            },
            {
              icon: Layers,
              t: "Discover",
              d: "Swipe through a curated feed ranked by on-chain reputation and AI match score.",
            },
            {
              icon: Heart,
              t: "Match & fund",
              d: "Mutual interest unlocks XMTP chat. Close the deal — mint a soulbound proof NFT.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 hover:neon-border transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-xl bg-[var(--neon)]/10 grid place-content-center mb-5 neon-border">
                <s.icon className="h-5 w-5 text-[var(--neon)]" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 glass-strong rounded-3xl p-8 md:p-14 text-center neon-border">
          <Rocket className="h-10 w-10 text-[var(--neon)] mx-auto mb-4" />
          <h3 className="font-display text-2xl md:text-4xl font-bold">Ready to find your match?</h3>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Email or wallet — both work. We handle the chain noise.
          </p>
          <Link
            to="/feed"
            data-testid="landing-cta-enter-btn"
            className="inline-flex items-center gap-2 mt-6 px-7 py-3.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 transition-all duration-300"
          >
            Enter Nexis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-6 px-6 md:px-12 text-xs text-muted-foreground flex items-center justify-between">
        <div>© 2026 Nexis Labs</div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon)]" /> Built on Mantle
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
      className="mt-16 grid grid-cols-3 max-w-2xl mx-auto gap-4 md:gap-8"
      data-testid="landing-stats"
    >
      <div className="glass rounded-2xl p-4 md:p-6" data-testid="stat-active-ideas">
        <div className="font-display text-2xl md:text-4xl font-bold text-[var(--neon)]">
          {stats.ideas.toLocaleString()}
        </div>
        <div className="text-xs md:text-sm text-muted-foreground mt-1">Active ideas</div>
      </div>
      <div className="glass rounded-2xl p-4 md:p-6" data-testid="stat-deals-matched">
        <div className="font-display text-2xl md:text-4xl font-bold text-[var(--neon)]">
          {stats.matches.toLocaleString()}
        </div>
        <div className="text-xs md:text-sm text-muted-foreground mt-1">Deals matched</div>
      </div>
      <div className="glass rounded-2xl p-4 md:p-6" data-testid="stat-capital-seeking">
        <div className="font-display text-2xl md:text-4xl font-bold text-[var(--neon)]">
          {formatCapital(stats.capital)}
        </div>
        <div className="text-xs md:text-sm text-muted-foreground mt-1">Capital seeking</div>
      </div>
    </div>
  );
}
