import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/nexis/AppShell";
import {
  Eye,
  Heart,
  MessageCircle,
  Plus,
  Zap,
  TrendingUp,
  Loader2,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuyBoost, generateIdeaId, useIsVerifiedBuilder } from "@/lib/web3/hooks";
import { useAuth } from "@/hooks/useAuth";
import {
  getIdeasByOwner,
  getIdeaSentiment,
  getIdeaViews,
  getMatches,
  type Idea,
} from "@/lib/nexis/ideasStore";
import { getProfile, type UserProfile } from "@/lib/nexis/profileStore";
import { formatExpiryText, getDaysRemaining } from "@/lib/nexis/expiry";
import { NetworkGuard } from "@/components/nexis/NetworkGuard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

const tiers = [
  { name: "Basic", price: "3 MNT", perks: ["Algorithmic boost", "48hr lift", "Priority queue"] },
  { name: "Pro", price: "5 MNT", perks: ["3x feed weight", "5 days top rank", "Featured tag"] },
  {
    name: "Elite",
    price: "10 MNT",
    perks: ["Prime placement", "7 days hero", "Direct DM unlocks"],
  },
];

function DashboardPage() {
  const [boostFor, setBoostFor] = useState<Idea | null>(null);
  const [tier, setTier] = useState<"Basic" | "Pro" | "Elite">("Pro");
  const { isAuthenticated, walletAddress, login, isOnMantle } = useAuth();
  const { data: isVerified } = useIsVerifiedBuilder(walletAddress || undefined);
  const { buyBoost, isPending, isConfirming, isSuccess, error: boostError } = useBuyBoost();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ownerIdeas, setOwnerIdeas] = useState<Idea[]>([]);
  const [totals, setTotals] = useState({ views: 0, likes: 0, dislikes: 0, matches: 0 });

  const refresh = () => {
    if (!walletAddress) {
      setOwnerIdeas([]);
      setTotals({ views: 0, likes: 0, dislikes: 0, matches: 0 });
      return;
    }
    const own = getIdeasByOwner(walletAddress);
    setOwnerIdeas(own);
    const t = own.reduce(
      (acc, idea) => {
        const s = getIdeaSentiment(idea.id);
        acc.likes += s.likes;
        acc.dislikes += s.dislikes;
        acc.views += getIdeaViews(idea.id);
        return acc;
      },
      { views: 0, likes: 0, dislikes: 0 },
    );
    const matchCount = getMatches().filter((m) => own.some((idea) => idea.id === m.ideaId)).length;
    setTotals({ ...t, matches: matchCount });
    setProfile(getProfile(walletAddress));
  };

  useEffect(refresh, [walletAddress]);
  useEffect(() => {
    if (isSuccess) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const handleBoost = () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    if (!isOnMantle) return; // NetworkGuard will already be visible
    if (!boostFor || !walletAddress) return;
    const tierIndex = tier === "Basic" ? 0 : tier === "Pro" ? 1 : 2;
    const ideaIdHex = generateIdeaId(boostFor.name, walletAddress);
    buyBoost(tierIndex as 0 | 1 | 2, ideaIdHex);
  };

  // Unauthenticated empty state
  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="px-4 md:px-8 pt-6 max-w-3xl mx-auto" data-testid="dashboard-page">
          <div className="glass-strong rounded-3xl p-8 md:p-12 text-center neon-border">
            <Wallet className="h-12 w-12 text-[var(--neon)] mx-auto mb-4" />
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Connect to access your console
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              The builder console shows your ideas, sentiment, and lets you boost listings on-chain.
            </p>
            <button
              onClick={() => login()}
              data-testid="dashboard-connect-btn"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 transition-all"
            >
              <Wallet className="h-4 w-4" /> Connect wallet
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const greetingName = profile?.name ? profile.name.split(/[\s.]+/)[0] : "builder";

  return (
    <AppShell>
      <div className="px-4 md:px-8 pt-6 space-y-8 max-w-6xl mx-auto" data-testid="dashboard-page">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-[var(--neon)] tracking-widest uppercase">
              Builder console
            </div>
            <h1
              className="font-display text-3xl md:text-4xl font-bold mt-1"
              data-testid="dashboard-greeting"
            >
              GM, {greetingName}.
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {ownerIdeas.length === 0
                ? "List your first idea to start matching with investors."
                : "Your ideas are alive on-chain. Here's how they're performing."}
            </p>
            {!isVerified && (
              <Link
                to="/onboarding"
                data-testid="dashboard-onboard-cta"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[var(--neon)]/10 text-[var(--neon)] text-xs neon-border hover:bg-[var(--neon)]/20"
              >
                <Sparkles className="h-3 w-3" /> Get verified to publish on-chain
              </Link>
            )}
          </div>
          <Link
            to="/dashboard/new-idea"
            data-testid="dashboard-new-idea-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" /> New idea
          </Link>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-3 gap-3 md:gap-5" data-testid="dashboard-stats">
          {[
            { i: Eye, l: "Total Views", v: totals.views.toLocaleString(), testId: "stat-views" },
            { i: Heart, l: "Right Swipes", v: totals.likes.toLocaleString(), testId: "stat-likes" },
            {
              i: MessageCircle,
              l: "Active Matches",
              v: totals.matches.toLocaleString(),
              testId: "stat-matches",
            },
          ].map((s) => (
            <div key={s.l} className="glass rounded-2xl p-4 md:p-6" data-testid={s.testId}>
              <div className="flex items-center justify-between">
                <s.i className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-display text-2xl md:text-4xl font-bold text-[var(--neon)] mt-3">
                {s.v}
              </div>
              <div className="text-[11px] md:text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Ideas */}
        <div>
          <h2 className="font-display text-xl font-bold mb-4">My ideas</h2>
          {ownerIdeas.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center" data-testid="dashboard-empty-ideas">
              <Sparkles className="h-10 w-10 text-[var(--neon)] mx-auto mb-3" />
              <div className="font-display font-bold text-lg">No ideas yet</div>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Publish your first startup listing to start showing up in investor swipe feeds.
              </p>
              <Link
                to="/dashboard/new-idea"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
              >
                <Plus className="h-4 w-4" /> Create first idea
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {ownerIdeas.map((idea) => {
                const sent = getIdeaSentiment(idea.id);
                const total = sent.likes + sent.dislikes;
                const likesPct = total === 0 ? 0 : Math.round((sent.likes / total) * 100);
                const dislikesPct = total === 0 ? 0 : 100 - likesPct;
                const daysLeft = getDaysRemaining(idea.createdAt);
                return (
                  <div
                    key={idea.id}
                    className="glass rounded-2xl overflow-hidden group hover:neon-border transition-all duration-300"
                    data-testid={`my-idea-${idea.id}`}
                  >
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={idea.image}
                        className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                      <span
                        className="absolute top-3 right-3 glass px-2.5 py-1 rounded-full text-[10px] text-[var(--neon)]"
                        data-testid={`idea-expiry-${idea.id}`}
                      >
                        {daysLeft > 0 ? formatExpiryText(idea.createdAt) : "Expired"}
                      </span>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <div className="font-display font-bold text-lg">{idea.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {idea.industry} • {idea.ask} ask
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Sentiment</span>
                          <span>
                            <span className="text-[var(--neon)]">{likesPct}%</span> / {dislikesPct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                          <div className="bg-[var(--neon)]" style={{ width: `${likesPct}%` }} />
                          <div className="bg-rose-500/60" style={{ width: `${dislikesPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                          <span>{getIdeaViews(idea.id).toLocaleString()} views</span>
                          <span>
                            {sent.likes} likes • {sent.dislikes} passes
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setBoostFor(idea)}
                        data-testid={`boost-btn-${idea.id}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--neon)]/10 text-[var(--neon)] neon-border hover:bg-[var(--neon)] hover:text-black transition-all duration-300 text-sm font-medium"
                      >
                        <Zap className="h-4 w-4" /> Boost visibility
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totals.likes > 0 && (
          <div className="glass-strong rounded-2xl p-5 flex items-center gap-4">
            <TrendingUp className="h-5 w-5 text-[var(--neon)]" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                You've received {totals.likes} right-swipes across {ownerIdeas.length} ideas.
              </div>
              <div className="text-xs text-muted-foreground">
                Keep your pitch under 60s and your tagline punchy for best results.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Boost modal */}
      <AnimatePresence>
        {boostFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setBoostFor(null)}
            data-testid="boost-modal"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 md:p-8 max-w-lg w-full neon-border"
            >
              <div className="text-xs text-[var(--neon)] uppercase tracking-widest">
                Boost · {boostFor.name}
              </div>
              <h3 className="font-display text-2xl font-bold mt-1">Push to the top.</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pay in MNT. Settled on Mantle Sepolia Testnet.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-6">
                {tiers.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTier(t.name as "Basic" | "Pro" | "Elite")}
                    data-testid={`boost-tier-${t.name}`}
                    className={`text-left p-4 rounded-xl transition-all duration-300 ${
                      tier === t.name
                        ? "neon-border bg-[var(--neon)]/10 neon-glow"
                        : "glass hover:border-white/20"
                    }`}
                  >
                    <div className="font-display font-bold">{t.name}</div>
                    <div className="text-[var(--neon)] text-lg font-bold mt-1">{t.price}</div>
                    <ul className="mt-3 space-y-1 text-[10px] text-muted-foreground">
                      {t.perks.map((p) => (
                        <li key={p}>• {p}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              {boostError && (
                <div
                  className="mt-4 glass rounded-xl p-3 text-xs text-rose-400 border border-rose-500/30"
                  data-testid="boost-error"
                >
                  {boostError.message}
                </div>
              )}
              <div className="w-full mt-6">
                <NetworkGuard>
                  <button
                    onClick={handleBoost}
                    disabled={isPending || isConfirming}
                    data-testid="boost-confirm-btn"
                    className="w-full py-3 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isPending ? "Confirm in wallet..." : "Processing..."}
                      </>
                    ) : isSuccess ? (
                      "Boosted! ✓"
                    ) : (
                      "Confirm with wallet"
                    )}
                  </button>
                </NetworkGuard>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
