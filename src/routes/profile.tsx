import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/nexis/AppShell";
import {
  Award,
  Github,
  Linkedin,
  Twitter,
  Wallet,
  Copy,
  Check,
  Pencil,
  ExternalLink,
  Bookmark,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNexisData, type Idea, type Match } from "@/hooks/useNexisData";
import { getInitials, shortAddress } from "@/lib/tableland/profiles";
import { useIsVerifiedBuilder } from "@/lib/web3/hooks";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { isAuthenticated, walletAddress, balance, login, isLoading } = useAuth();
  const { data: isVerifiedOnChain } = useIsVerifiedBuilder(walletAddress || undefined);
  const {
    myProfile: profile,
    matches,
    ideas,
    getIdeasByOwner,
    getSavedIdeas,
    toggleSaved,
    getIdeaSentiment,
  } = useNexisData();

  const [ownerIdeas, setOwnerIdeas] = useState<Idea[]>([]);
  const [rightSwipes, setRightSwipes] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [dealMatches, setDealMatches] = useState<Match[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([]);
  const [copied, setCopied] = useState(false);

  const loadAll = async () => {
    if (!walletAddress) {
      setOwnerIdeas([]);
      setRightSwipes(0);
      setMatchCount(0);
      setSavedIdeas([]);
      return;
    }
    const own = await getIdeasByOwner(walletAddress);
    setOwnerIdeas(own);
    let totalLikes = 0;
    for (const idea of own) {
      const s = await getIdeaSentiment(idea.id);
      totalLikes += s.likes;
    }
    setRightSwipes(totalLikes);
    setMatchCount(matches.length);
    setDealMatches(matches.filter(m => m.dealStatus === "confirmed"));
    setSavedIdeas(getSavedIdeas());
  };

  useEffect(() => { loadAll(); }, [walletAddress, matches, ideas]);

  const handleUnsave = async (ideaId: string) => {
    await toggleSaved(ideaId);
    setSavedIdeas(getSavedIdeas());
  };

  const handleCopy = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  // Not authenticated state
  if (!isAuthenticated && !isLoading) {
    return (
      <AppShell>
        <div className="px-4 md:px-8 pt-12 max-w-3xl mx-auto">
          <div
            className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-8 md:p-16 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            data-testid="profile-auth-required"
          >
            <Wallet className="h-16 w-16 text-[#00ff9d] mx-auto mb-6 shadow-[0_0_20px_rgba(0,255,157,0.15)]" />
            <h2 className="font-display text-3xl font-black text-white tracking-tight">Connect your identity</h2>
            <p className="text-white/50 text-sm mt-3 max-w-md mx-auto leading-relaxed">
              Authenticate via Web3 wallet to access your developer credentials, listed idea deck, matched investors, and closed SBT proof tokens.
            </p>
            <button
              onClick={() => login()}
              data-testid="profile-connect-btn"
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#00ff9d] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(0,255,157,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Wallet className="h-4 w-4" /> Connect Wallet
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const initials = getInitials(profile, walletAddress);
  const displayName = profile?.name || (walletAddress ? shortAddress(walletAddress) : "anon");
  const subtitle =
    profile?.role === "investor"
      ? `${(profile as { firmName?: string }).firmName || "Investor"} • ${profile?.location || ""}`
      : `${profile?.role === "builder" ? "Founder" : "Member"}${profile?.location ? ` • ${profile.location}` : ""}`;
  const verifiedLabel =
    profile?.role === "investor" ? "Investor" : isVerifiedOnChain ? "Verified Builder" : "Builder";
  const explorerUrl = walletAddress
    ? `https://sepolia.mantlescan.xyz/address/${walletAddress}`
    : undefined;

  return (
    <AppShell>
      <div className="px-4 md:px-8 pt-4 max-w-4xl mx-auto space-y-6" data-testid="profile-page">
        {/* Bento Card 1: Identity & Credentials (Header) */}
        <div className="bento-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-[#00ff9d]/8 blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1">
              {/* Profile Avatar */}
              <div
                className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#00ff9d] to-emerald-800 grid place-content-center text-3xl font-display font-black text-black shadow-[0_0_20px_rgba(0,255,157,0.3)] overflow-hidden border border-white/20 shrink-0"
                data-testid="profile-avatar"
              >
                {profile?.profilePicUrl ? (
                  <img
                    src={profile.profilePicUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              
              {/* Credentials Text */}
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1
                    className="font-display text-2xl md:text-3xl font-black truncate text-white leading-none"
                    data-testid="profile-name"
                  >
                    {displayName}
                  </h1>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/25 shadow-sm"
                    data-testid="profile-verified-badge"
                  >
                    {verifiedLabel}
                  </span>
                  {balance && (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/[0.04] text-white/50 border border-white/10"
                      data-testid="profile-balance"
                    >
                      {balance}
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-white/50 mt-2 font-bold tracking-wide" data-testid="profile-subtitle">
                  {subtitle}
                </div>
                
                {/* Social links */}
                <div className="flex items-center gap-2 mt-4 select-none">
                  {profile?.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="profile-linkedin-btn"
                      className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#00ff9d]/30 grid place-content-center transition-all"
                    >
                      <Linkedin className="h-4 w-4 text-white/70" />
                    </a>
                  )}
                  {profile?.twitter && (
                    <a
                      href={
                        profile.twitter.startsWith("http")
                          ? profile.twitter
                          : `https://x.com/${profile.twitter.replace("@", "")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="profile-twitter-btn"
                      className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#00ff9d]/30 grid place-content-center transition-all"
                    >
                      <Twitter className="h-4 w-4 text-white/70" />
                    </a>
                  )}
                  {profile?.role === "builder" && profile?.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="profile-github-btn"
                      className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#00ff9d]/30 grid place-content-center transition-all"
                    >
                      <Github className="h-4 w-4 text-white/70" />
                    </a>
                  )}
                  <Link
                    to="/onboarding"
                    search={{ edit: true }}
                    data-testid="profile-edit-btn"
                    className="h-8 px-4.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#00ff9d]/30 flex items-center gap-1.5 transition-all text-[11px] font-bold text-white/90"
                  >
                    <Pencil className="h-3 w-3" /> Edit Profile
                  </Link>
                </div>
              </div>
            </div>

            {/* Wallet Info Panel */}
            <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-4.5 w-full md:w-auto shadow-inner group-hover:border-[#00ff9d]/20 transition-colors">
              <div className="text-[9px] text-white/40 uppercase tracking-widest font-black">
                Allocator Wallet
              </div>
              <div className="flex items-center gap-2.5 mt-1.5 font-bold">
                <Wallet className="h-4 w-4 text-[#00ff9d]" />
                <span className="font-mono text-xs text-white/95" data-testid="profile-wallet-short">
                  {walletAddress ? shortAddress(walletAddress) : "—"}
                </span>
                {walletAddress && (
                  <button
                    onClick={handleCopy}
                    data-testid="profile-copy-btn"
                    className="text-white/40 hover:text-white transition-colors cursor-pointer"
                    aria-label="Copy wallet address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[#00ff9d]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="profile-explorer-link"
                  className="mt-3 flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-[#00ff9d] uppercase tracking-wide transition-colors"
                >
                  Verify Explorer <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Stats Bento Row */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5" data-testid="profile-stats">
          <StatCard
            label={profile?.role === "investor" ? "Ideas swiped" : "Ideas live"}
            value={ownerIdeas.length.toString()}
            testId="stat-ideas-live"
          />
          <StatCard
            label={profile?.role === "investor" ? "Matches" : "Right swipes received"}
            value={(profile?.role === "investor" ? matchCount : rightSwipes).toLocaleString()}
            testId="stat-right-swipes"
          />
          <StatCard
            label="Deals closed"
            value={dealMatches
              .filter((m) => !m.unread && m.lastMessage?.toLowerCase().includes("funded"))
              .length.toString()}
            testId="stat-deals-closed"
          />
        </div>

        {/* Listed ideas (Founders only) */}
        {profile?.role !== "investor" && (
          <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-6" data-testid="profile-ideas-section">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h2 className="font-display font-black text-lg text-white">Your Listed Startups</h2>
              <Link
                to="/dashboard/new-idea"
                className="text-xs font-bold text-[#00ff9d] hover:underline"
                data-testid="profile-add-idea-link"
              >
                + New Idea Profile
              </Link>
            </div>
            {ownerIdeas.length === 0 ? (
              <div className="text-xs text-white/40 text-center py-8">
                No active ideas. Post your startup profile to show up in feeds.
              </div>
            ) : (
              <div className="flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto scrollbar-hide pb-3 px-1 snap-x snap-mandatory">
                {ownerIdeas.map((idea) => (
                  <Link
                    key={idea.id}
                    to="/dashboard"
                    data-testid={`profile-idea-${idea.id}`}
                    className="bento-card p-5 group flex flex-col justify-between min-h-[145px] shrink-0 w-[85%] sm:w-auto snap-start"
                  >
                    <div>
                      <div className="text-[9px] text-[#00ff9d] font-black uppercase tracking-widest">{idea.industry}</div>
                      <div className="font-display font-black text-base mt-0.5 text-white group-hover:text-[#00ff9d] transition-colors">{idea.name}</div>
                      <div className="text-xs text-white/50 mt-1 line-clamp-1">
                        {idea.tagline}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 text-xs text-[#00ff9d] font-mono font-bold">
                      {idea.ask} • {idea.equity} Equity
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved (bookmarked) ideas bento section */}
        <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-6" data-testid="profile-saved-section">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <Bookmark className="h-4 w-4 text-yellow-400" />
            <h2 className="font-display font-black text-lg text-white">Saved for later</h2>
            <span className="text-xs font-bold text-white/30">({savedIdeas.length})</span>
          </div>
          {savedIdeas.length === 0 ? (
            <div
              className="rounded-2xl p-8 border border-dashed border-white/15 text-center text-xs text-white/40 bg-white/[0.01]"
              data-testid="profile-saved-empty"
            >
              Tap the bookmark icon on any startup card in discovery deck to evaluate them here.
            </div>
          ) : (
            <div className="flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto scrollbar-hide pb-3 px-1 snap-x snap-mandatory">
              {savedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="bento-card overflow-hidden flex relative group min-h-[90px] shrink-0 w-[85%] sm:w-auto snap-start"
                  data-testid={`saved-idea-${idea.id}`}
                >
                  <Link to="/feed" className="flex flex-1">
                    <img src={idea.image} alt="" className="h-20 w-20 object-cover shrink-0 border-r border-white/5" />
                    <div className="p-3.5 flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="text-[8px] text-yellow-400 font-black uppercase tracking-widest">
                          {idea.industry}
                        </div>
                        <div className="font-display font-black text-sm mt-0.5 truncate text-white">
                          {idea.name}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#00ff9d] font-mono font-bold mt-1">
                        {idea.ask} • {idea.equity} Equity
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleUnsave(idea.id)}
                    data-testid={`unsave-${idea.id}`}
                    aria-label={`Remove ${idea.name} from saved`}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/[0.02] border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 grid place-content-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 text-rose-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proof of Funding Certificate Badges */}
        <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-6" data-testid="profile-pof-section">
          <div className="flex items-center gap-2.5 mb-6 border-b border-white/5 pb-3">
            <Award className="h-5 w-5 text-[#00ff9d] drop-shadow-[0_0_8px_rgba(0,255,157,0.4)]" />
            <h2 className="font-display font-black text-lg text-white">Proof of Funding Tokens</h2>
          </div>
          {dealMatches.length === 0 ? (
            <div className="rounded-2xl p-8 border border-dashed border-white/15 grid place-content-center text-center bg-white/[0.01]">
              <div className="text-xs text-white/40 leading-relaxed max-w-xs">
                Authorize milestones inside matching chat rooms to mint an immutable, custom-visual Soulbound Token.
              </div>
            </div>
          ) : (
            <div className="flex md:grid md:grid-cols-2 gap-5 overflow-x-auto scrollbar-hide pb-3 px-1 snap-x snap-mandatory">
              {dealMatches.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-black/60 p-6 shadow-2xl flex flex-col justify-between shrink-0 w-[85%] md:w-auto snap-start"
                  style={{
                    background: 'linear-gradient(135deg, rgba(2,8,6,0.95) 0%, rgba(7,27,18,0.75) 50%, rgba(2,8,6,0.95) 100%)',
                    boxShadow: '0 0 25px rgba(0, 255, 157, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.01)',
                  }}
                  data-testid={`pof-card-${m.id}`}
                >
                  {/* Decorative corner highlights */}
                  <div className="absolute top-3.5 left-3.5 w-3 h-3 border-t-2 border-l-2 border-[#00ff9d] opacity-50" />
                  <div className="absolute top-3.5 right-3.5 w-3 h-3 border-t-2 border-r-2 border-[#00ff9d] opacity-50" />
                  <div className="absolute bottom-3.5 left-3.5 w-3 h-3 border-b-2 border-l-2 border-[#00ff9d] opacity-50" />
                  <div className="absolute bottom-3.5 right-3.5 w-3 h-3 border-b-2 border-r-2 border-[#00ff9d] opacity-50" />

                  {/* Certificate Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-[#00ff9d] filter drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
                      <div>
                        <div className="text-[9px] tracking-[0.2em] font-black text-white/40 uppercase">Nexis Certified</div>
                        <div className="text-[9px] font-mono text-[#00ff9d] font-black">SOULBOUND TOKEN</div>
                      </div>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#00ff9d]/15 text-[#00ff9d] font-black border border-[#00ff9d]/20 uppercase tracking-wider font-mono">
                      Verified
                    </span>
                  </div>

                  {/* Main Details */}
                  <div className="space-y-4 my-2 text-left">
                    <div>
                      <div className="text-[8px] text-white/40 uppercase tracking-widest font-black">Funded Startup</div>
                      <div className="text-xl font-black font-display text-white mt-1 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {m.ideaName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/[0.04] pt-3">
                      <div>
                        <div className="text-[8px] text-white/40 uppercase font-black">Builder Address</div>
                        <div className="text-[10px] font-mono text-white/80 truncate mt-0.5 font-bold" title={m.builderWallet}>
                          {m.builderWallet ? `${m.builderWallet.slice(0, 6)}...${m.builderWallet.slice(-4)}` : "n/a"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] text-white/40 uppercase font-black">Investor Address</div>
                        <div className="text-[10px] font-mono text-white/80 truncate mt-0.5 font-bold" title={m.investorWallet}>
                          {m.investorWallet ? `${m.investorWallet.slice(0, 6)}...${m.investorWallet.slice(-4)}` : "n/a"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                    <div>
                      <div className="text-[8px] text-white/40 uppercase font-black">Date Certified</div>
                      <div className="text-[10px] font-black text-[#00d2ff] mt-0.5">
                        {m.matchedAt ? new Date(m.matchedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "n/a"}
                      </div>
                    </div>
                    {m.dealId && (
                      <a
                        href={`https://sepolia.mantlescan.xyz/tx/${m.dealId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] text-[#00ff9d] font-mono hover:underline bg-white/[0.03] px-2.5 py-1.5 rounded-lg border border-white/[0.05] transition-all hover:bg-[#00ff9d]/10 hover:border-[#00ff9d]/30"
                      >
                        Verify SBT ↗
                      </a>
                    )}
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

function StatCard({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="bento-card p-4 sm:p-5 flex flex-col justify-between min-h-[95px] sm:min-h-[110px]" data-testid={testId}>
      <div className="font-display text-2xl sm:text-4xl font-black text-[#00ff9d] drop-shadow-[0_0_12px_rgba(0,255,157,0.3)]">{value}</div>
      <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-white/40 font-bold mt-1.5 leading-tight">{label}</div>
    </div>
  );
}
