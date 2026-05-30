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
  Bookmark,
  Award,
  Layers,
  ChevronRight,
  BarChart3,
  Calendar,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBuyBoost, generateIdeaId, useIsVerifiedBuilder } from "@/lib/web3/hooks";
import { useAuth } from "@/hooks/useAuth";
import {
  useNexisData,
  type Idea,
  type UserProfile,
} from "@/hooks/useNexisData";
import { formatExpiryText, getDaysRemaining } from "@/lib/nexis/expiry";
import { getIdeaViews } from "@/lib/nexis/ideasStore";
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
  const { myProfile: profile, matches, getIdeasByOwner, getIdeaSentiment, getSavedIdeas } = useNexisData();

  const [ownerIdeas, setOwnerIdeas] = useState<Idea[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([]);
  const [totals, setTotals] = useState({ views: 0, likes: 0, dislikes: 0, matches: 0 });

  const refresh = async () => {
    if (!walletAddress) {
      setOwnerIdeas([]);
      setSavedIdeas([]);
      setTotals({ views: 0, likes: 0, dislikes: 0, matches: 0 });
      return;
    }
    if (profile?.role === "investor") {
      setSavedIdeas(getSavedIdeas());
    } else {
      const own = await getIdeasByOwner(walletAddress);
      setOwnerIdeas(own);
      let views = 0, likes = 0, dislikes = 0;
      for (const idea of own) {
        const s = await getIdeaSentiment(idea.id);
        likes += s.likes;
        dislikes += s.dislikes;
        views += s.views;
      }
      const matchCount = matches.filter((m) => own.some((idea) => idea.id === m.ideaId)).length;
      setTotals({ views, likes, dislikes, matches: matchCount });
    }
  };

  useEffect(() => { refresh(); }, [walletAddress, matches, profile]);
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
        <div className="px-4 md:px-8 pt-12 max-w-3xl mx-auto" data-testid="dashboard-page">
          <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-8 md:p-16 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="h-16 w-16 rounded-2xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,255,157,0.15)]">
              <Wallet className="h-8 w-8 text-[#00ff9d]" />
            </div>
            <h2 className="font-display text-3xl font-black text-white tracking-tight">
              Connect console credentials
            </h2>
            <p className="text-white/50 text-sm mt-3 max-w-md mx-auto leading-relaxed">
              Verify your Web3 wallet signature to view active listings, sentiment analytics, matches, and on-chain boosting telemetry.
            </p>
            <button
              onClick={() => login()}
              data-testid="dashboard-connect-btn"
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#00ff9d] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(0,255,157,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Wallet className="h-4 w-4" /> Connect Wallet
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (profile?.role === "investor") {
    const fundedDeals = matches.filter((m) => m.dealStatus === "confirmed");
    const pendingDeals = matches.filter((m) => m.dealStatus === "requested");

    return (
      <AppShell>
        <div className="px-4 md:px-8 pt-4 space-y-8 max-w-6xl mx-auto" data-testid="dashboard-page">
          {/* Header */}
          <div className="flex items-end justify-between flex-wrap gap-6 border-b border-white/5 pb-6">
            <div>
              <div className="text-[10px] text-[#00ff9d] tracking-widest uppercase font-extrabold flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff9d]" />
                </span>
                Active Allocator Node
              </div>
              <h1
                className="font-display text-4xl md:text-5xl font-black mt-2 text-gradient-apple"
                data-testid="dashboard-greeting"
              >
                GM, {profile.name ? profile.name.split(/[\s.]+/)[0] : "investor"}.
              </h1>
              <p className="text-white/50 text-xs md:text-sm mt-1.5 font-medium">
                Review matches, closed deals, and bookmarked startups to track your active pipeline.
              </p>
            </div>
            <Link
              to="/feed"
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#00ff9d] text-black font-extrabold text-xs shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4" /> Start Swipe Session
            </Link>
          </div>

          {/* Analytics Bento Grid */}
          <div className="grid grid-cols-3 gap-3 md:gap-5" data-testid="dashboard-stats">
            {[
              { i: Bookmark, l: "Saved Startups", v: savedIdeas.length.toString(), testId: "stat-saved" },
              { i: Heart, l: "Matched Founders", v: matches.length.toString(), testId: "stat-matches" },
              {
                i: Award,
                l: "Soulbound Deals Closed",
                v: fundedDeals.length.toString(),
                testId: "stat-funded",
              },
            ].map((s) => (
              <div key={s.l} className="bento-card p-3 sm:p-4 md:p-6 flex flex-col justify-between min-h-[90px] sm:min-h-[110px] md:min-h-[140px]" data-testid={s.testId}>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-white/40 font-bold leading-tight line-clamp-1 md:line-clamp-none">
                    {s.l === "Soulbound Deals Closed" ? (
                      <>
                        <span className="inline md:hidden">Deals Closed</span>
                        <span className="hidden md:inline">Soulbound Deals Closed</span>
                      </>
                    ) : s.l}
                  </span>
                  <div className="hidden sm:grid h-7 w-7 md:h-8 md:w-8 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/20 place-content-center shrink-0">
                    <s.i className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#00ff9d]" />
                  </div>
                </div>
                <div className="font-display text-xl sm:text-2xl md:text-4xl font-black text-[#00ff9d] mt-2 sm:mt-4 drop-shadow-[0_0_12px_rgba(0,255,157,0.3)]">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {/* Deals Pipeline */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#00ff9d]" />
              <h2 className="font-display text-xl font-bold text-white">Deal Flow Settlement Pipeline</h2>
            </div>
            
            {matches.length === 0 ? (
              <div className="border border-white/[0.08] bg-[#090b0a]/50 backdrop-blur-xl rounded-3xl p-12 text-center" data-testid="dashboard-empty-matches">
                <Heart className="h-10 w-10 text-[#00ff9d]/40 mx-auto mb-4" />
                <div className="font-display font-bold text-lg text-white">No active matches</div>
                <p className="text-sm text-white/50 mt-1 max-w-sm mx-auto leading-relaxed">
                  Swipe right on startup ideas in the discovery deck to match with founders and begin E2E encrypted deal negotiations.
                </p>
                <Link
                  to="/feed"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-[#00ff9d] text-black font-extrabold hover:scale-105 active:scale-95 transition-all text-xs shadow-[0_0_15px_rgba(0,255,157,0.3)]"
                >
                  <Layers className="h-3.5 w-3.5" /> Go to Discovery Feed
                </Link>
              </div>
            ) : (
              <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase tracking-widest text-white/40 font-black">
                        <th className="p-4 pl-6">Startup / Founder</th>
                        <th className="p-4">Industry / Ask</th>
                        <th className="p-4">Milestone Status</th>
                        <th className="p-4 pr-6 text-right">E2E Workspace</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m) => {
                        let statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        let statusLabel = "Match Connected";
                        if (m.dealStatus === "confirmed") {
                          statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]";
                          statusLabel = "Funded (SBT Minted)";
                        } else if (m.dealStatus === "requested") {
                          statusColor = "bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/20 animate-pulse shadow-[0_0_10px_rgba(0,255,157,0.1)]";
                          statusLabel = "Confirmation Pending";
                        } else if (m.dealStatus === "rejected") {
                          statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                          statusLabel = "Terminated";
                        }

                        return (
                          <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3.5">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00ff9d]/30 to-emerald-950 border border-[#00ff9d]/20 grid place-content-center text-xs font-black shrink-0 text-[#00ff9d] shadow-sm">
                                  {m.builderAvatar}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-white/95 group-hover:text-[#00ff9d] transition-colors truncate">{m.ideaName}</div>
                                  <div className="text-[11px] text-white/50 truncate mt-0.5">{m.builderName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-xs font-bold text-white/90">{m.industry}</div>
                              <div className="text-[10px] text-white/40 font-mono mt-0.5 uppercase">Match Node</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <Link
                                to="/chat"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-[#00ff9d] border border-white/10 hover:border-transparent text-white/90 hover:text-black font-extrabold text-xs transition-all cursor-pointer shadow-sm"
                              >
                                {m.dealStatus === "requested" ? "Review Deal" : "Open Chat"}{" "}
                                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Bookmarked Ideas */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bookmark className="h-5 w-5 text-[#00ff9d]" />
              <h2 className="font-display text-xl font-bold text-white">Saved Startups</h2>
            </div>
            
            {savedIdeas.length === 0 ? (
              <div className="rounded-2xl p-8 border border-dashed border-white/15 text-center text-xs text-white/40 bg-white/[0.01]">
                Bookmark startups in the discovery deck to review their credentials here.
              </div>
            ) : (
              <div className="flex md:grid md:grid-cols-2 gap-5 overflow-x-auto scrollbar-hide pb-3 px-1 snap-x snap-mandatory">
                {savedIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="bento-card overflow-hidden group flex min-h-[150px] shrink-0 w-[85%] md:w-auto snap-start hover:border-[#00ff9d]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,157,0.05)]"
                  >
                    <img src={idea.image} className="w-28 sm:w-32 h-auto object-cover opacity-40 group-hover:opacity-60 transition-opacity border-r border-white/5" alt="" />
                    <div className="p-5 flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="text-[9px] text-[#00ff9d] font-black uppercase tracking-widest">{idea.industry}</div>
                        <div className="font-display font-black text-base mt-0.5 truncate text-white">{idea.name}</div>
                        <p className="text-xs text-white/50 mt-1 line-clamp-2 leading-relaxed">{idea.tagline}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <span className="text-[11px] text-[#00ff9d] font-mono font-bold">
                          {idea.ask} • {idea.equity} Equity
                        </span>
                        <Link
                          to="/feed"
                          className="text-[11px] text-white/50 hover:text-[#00ff9d] font-bold flex items-center gap-0.5 transition-colors"
                        >
                          View Deck <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const greetingName = profile?.name ? profile.name.split(/[\s.]+/)[0] : "builder";

  return (
    <AppShell>
      <div className="px-4 md:px-8 pt-4 space-y-8 max-w-6xl mx-auto" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-6 border-b border-white/5 pb-6">
          <div>
            <div className="text-[10px] text-[#00ff9d] tracking-widest uppercase font-extrabold flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff9d]" />
              </span>
              Verified Creator Node
            </div>
            <h1
              className="font-display text-4xl md:text-5xl font-black mt-2 text-gradient-apple"
              data-testid="dashboard-greeting"
            >
              GM, {greetingName}.
            </h1>
            <p className="text-white/50 text-xs md:text-sm mt-1.5 font-medium">
              {ownerIdeas.length === 0
                ? "List your first idea to start matching with investors."
                : "Your ideas are live on-chain. Here's how they're performing."}
            </p>
            {!isVerified && (
              <Link
                to="/onboarding"
                search={{}}
                data-testid="dashboard-onboard-cta"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-[#00ff9d]/10 text-[#00ff9d] text-xs font-bold border border-[#00ff9d]/20 hover:bg-[#00ff9d]/20 shadow-[0_0_10px_rgba(0,255,157,0.05)] transition-colors"
              >
                <Sparkles className="h-3 w-3 animate-pulse" /> Get verified to publish on-chain
              </Link>
            )}
          </div>
          <Link
            to="/dashboard/new-idea"
            data-testid="dashboard-new-idea-btn"
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#00ff9d] text-black font-extrabold text-xs shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Idea Profile
          </Link>
        </div>

        {/* Analytics Bento Grid */}
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
            <div key={s.l} className="bento-card p-3 sm:p-4 md:p-6 flex flex-col justify-between min-h-[90px] sm:min-h-[110px] md:min-h-[140px]" data-testid={s.testId}>
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] uppercase tracking-wider text-white/40 font-bold leading-tight line-clamp-1 md:line-clamp-none">{s.l}</span>
                <div className="hidden sm:grid h-7 w-7 md:h-8 md:w-8 rounded-lg bg-white/[0.02] border border-white/10 place-content-center shrink-0">
                  <s.i className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#00ff9d]" />
                </div>
              </div>
              <div className="font-display text-xl sm:text-2xl md:text-4xl font-black text-[#00ff9d] mt-2 sm:mt-4 drop-shadow-[0_0_12px_rgba(0,255,157,0.3)]">
                {s.v}
              </div>
            </div>
          ))}
        </div>

        {/* Ideas */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[#00ff9d]" />
            <h2 className="font-display text-xl font-bold text-white">My Listed Ideas</h2>
          </div>
          
          {ownerIdeas.length === 0 ? (
            <div className="border border-white/[0.08] bg-[#090b0a]/50 backdrop-blur-xl rounded-3xl p-12 text-center" data-testid="dashboard-empty-ideas">
              <Sparkles className="h-10 w-10 text-[#00ff9d]/40 mx-auto mb-4" />
              <div className="font-display font-bold text-lg text-white">No active listings</div>
              <p className="text-sm text-white/50 mt-1 max-w-sm mx-auto leading-relaxed">
                Publish your first startup profile to populate the investor matchmaking feeds on the Mantle network.
              </p>
              <Link
                to="/dashboard/new-idea"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-[#00ff9d] text-black font-extrabold hover:scale-105 active:scale-95 transition-all text-xs shadow-[0_0_15px_rgba(0,255,157,0.3)]"
              >
                <Plus className="h-3.5 w-3.5" /> Create First Listing
              </Link>
            </div>
          ) : (
            <div className="flex md:grid md:grid-cols-2 gap-5 overflow-x-auto scrollbar-hide pb-3 px-1 snap-x snap-mandatory">
              {ownerIdeas.map((idea) => {
                const sent = getIdeaSentiment(idea.id);
                const total = sent.likes + sent.dislikes;
                const likesPct = total === 0 ? 0 : Math.round((sent.likes / total) * 100);
                const dislikesPct = total === 0 ? 0 : 100 - likesPct;
                const daysLeft = getDaysRemaining(idea.createdAt);
                return (
                  <div
                    key={idea.id}
                    className="bento-card overflow-hidden group shrink-0 w-[85%] md:w-auto snap-start hover:border-[#00ff9d]/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,157,0.05)]"
                    data-testid={`my-idea-${idea.id}`}
                  >
                    <div className="relative h-36 overflow-hidden">
                      <img
                        src={idea.image}
                        className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090b0a] via-[#090b0a]/30 to-transparent" />
                      <span
                        className="absolute top-4 right-4 bg-[#090b0a]/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold text-[#00ff9d] border border-[#00ff9d]/20 shadow-md"
                        data-testid={`idea-expiry-${idea.id}`}
                      >
                        {daysLeft > 0 ? formatExpiryText(idea.createdAt) : "Expired"}
                      </span>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <div className="font-display font-black text-xl text-white group-hover:text-[#00ff9d] transition-colors">{idea.name}</div>
                        <div className="text-xs text-white/50 mt-1 font-semibold">
                          {idea.industry} • {idea.ask} Ask
                        </div>
                      </div>
                      
                      <div className="space-y-2 border-t border-white/5 pt-4">
                        <div className="flex items-center justify-between text-[11px] font-bold text-white/60">
                          <span>Sentiment Feedback</span>
                          <span>
                            <span className="text-[#00ff9d]">{likesPct}%</span> / {dislikesPct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden flex border border-white/5 shadow-inner">
                          <div className="bg-[#00ff9d] shadow-[0_0_8px_rgba(0,255,157,0.8)]" style={{ width: `${likesPct}%` }} />
                          <div className="bg-rose-500/60" style={{ width: `${dislikesPct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 font-semibold">
                          <span>{getIdeaViews(idea.id).toLocaleString()} unique views</span>
                          <span>
                            {sent.likes} likes • {sent.dislikes} passes
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setBoostFor(idea)}
                        data-testid={`boost-btn-${idea.id}`}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.02] hover:bg-[#00ff9d] border border-white/10 hover:border-transparent text-white hover:text-black font-extrabold text-xs transition-all duration-300 shadow-sm cursor-pointer"
                      >
                        <Zap className="h-4 w-4" /> Boost Visibility
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totals.likes > 0 && (
          <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-2xl p-6 flex items-center gap-4 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center shrink-0">
              <TrendingUp className="h-5 w-5 text-[#00ff9d]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-extrabold text-white">
                Startups performing at maximum efficiency
              </div>
              <div className="text-xs text-white/50 mt-0.5 leading-relaxed font-semibold">
                You've received {totals.likes} right-swipes across {ownerIdeas.length} listed ideas. Keep pitches under 60s for best investor response.
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
            className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setBoostFor(null)}
            data-testid="boost-modal"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="border border-white/15 bg-[#090b0a]/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <div className="text-[10px] text-[#00ff9d] uppercase tracking-widest font-black">
                On-Chain Accelerator Boost
              </div>
              <h3 className="font-display text-2xl font-black mt-1 text-white">Featured placement</h3>
              <p className="text-xs text-white/50 mt-1 font-medium leading-relaxed">
                Choose a priority placement tier. Payment is processed in MNT via the Mantle Sepolia network.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                {tiers.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTier(t.name as "Basic" | "Pro" | "Elite")}
                    data-testid={`boost-tier-${t.name}`}
                    className={`text-left p-4 rounded-xl transition-all duration-300 flex flex-col justify-between min-h-[160px] cursor-pointer ${
                      tier === t.name
                        ? "border-[#00ff9d] bg-[#00ff9d]/8 shadow-[0_0_15px_rgba(0,255,157,0.15)]"
                        : "border border-white/10 bg-white/[0.01] hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="font-display font-black text-sm text-white">{t.name}</div>
                      <div className="text-[#00ff9d] text-lg font-black mt-1.5">{t.price}</div>
                    </div>
                    <ul className="mt-4 space-y-1 text-[9px] text-white/50 font-semibold">
                      {t.perks.map((p) => (
                        <li key={p} className="truncate">• {p}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              
              {boostError && (
                <div
                  className="mt-4 border border-rose-500/20 bg-rose-500/10 rounded-xl p-3 text-xs text-rose-400 font-bold"
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
                    className="w-full py-3.5 rounded-full bg-[#00ff9d] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(0,255,157,0.35)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        {isPending ? "Confirming in Wallet..." : "Broadcasting Transaction..."}
                      </>
                    ) : isSuccess ? (
                      "Visibility Boosted! ✓"
                    ) : (
                      "Confirm & Purchase Boost"
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
