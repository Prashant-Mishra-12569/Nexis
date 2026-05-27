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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, getInitials, shortAddress, type UserProfile } from "@/lib/nexis/profileStore";
import {
  getIdeasByOwner,
  getReceivedRightSwipes,
  getMatches,
  type Idea,
  type Match,
} from "@/lib/nexis/ideasStore";
import { useIsVerifiedBuilder } from "@/lib/web3/hooks";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { isAuthenticated, walletAddress, balance, login, isLoading } = useAuth();
  const { data: isVerifiedOnChain } = useIsVerifiedBuilder(walletAddress || undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ownerIdeas, setOwnerIdeas] = useState<Idea[]>([]);
  const [rightSwipes, setRightSwipes] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [dealMatches, setDealMatches] = useState<Match[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setProfile(null);
      setOwnerIdeas([]);
      setRightSwipes(0);
      setMatchCount(0);
      return;
    }
    setProfile(getProfile(walletAddress));
    setOwnerIdeas(getIdeasByOwner(walletAddress));
    setRightSwipes(getReceivedRightSwipes(walletAddress));
    const allMatches = getMatches();
    setMatchCount(allMatches.length);
    setDealMatches(allMatches);
  }, [walletAddress]);

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
        <div className="px-4 md:px-8 pt-6 max-w-4xl mx-auto">
          <div
            className="glass-strong rounded-3xl p-8 md:p-12 text-center neon-border"
            data-testid="profile-auth-required"
          >
            <Wallet className="h-12 w-12 text-[var(--neon)] mx-auto mb-4" />
            <h2 className="font-display text-2xl md:text-3xl font-bold">Connect your wallet</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Sign in to view your on-chain reputation, ideas, matches, and proof-of-funding badges.
            </p>
            <button
              onClick={() => login()}
              data-testid="profile-connect-btn"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 transition-all"
            >
              <Wallet className="h-4 w-4" /> Connect wallet
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
      <div className="px-4 md:px-8 pt-6 max-w-4xl mx-auto space-y-6" data-testid="profile-page">
        {/* Identity card */}
        <div className="glass-strong rounded-3xl p-6 md:p-8 neon-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[var(--neon)]/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start gap-6">
            <div
              className="h-24 w-24 rounded-2xl bg-gradient-to-br from-[var(--neon)] to-emerald-800 grid place-content-center text-3xl font-display font-bold text-black neon-glow overflow-hidden"
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="font-display text-2xl md:text-3xl font-bold truncate"
                  data-testid="profile-name"
                >
                  {displayName}
                </h1>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--neon)]/10 text-[var(--neon)] neon-border"
                  data-testid="profile-verified-badge"
                >
                  {verifiedLabel}
                </span>
                {balance && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] glass"
                    data-testid="profile-balance"
                  >
                    {balance}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1" data-testid="profile-subtitle">
                {subtitle}
              </div>
              <div className="flex items-center gap-2 mt-4">
                {profile?.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="profile-linkedin-btn"
                    className="h-8 w-8 rounded-full glass grid place-content-center hover:neon-border transition-all"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
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
                    className="h-8 w-8 rounded-full glass grid place-content-center hover:neon-border transition-all"
                  >
                    <Twitter className="h-3.5 w-3.5" />
                  </a>
                )}
                {profile?.role === "builder" && profile?.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="profile-github-btn"
                    className="h-8 w-8 rounded-full glass grid place-content-center hover:neon-border transition-all"
                  >
                    <Github className="h-3.5 w-3.5" />
                  </a>
                )}
                <Link
                  to="/onboarding"
                  data-testid="profile-edit-btn"
                  className="h-8 px-3 rounded-full glass flex items-center gap-1.5 hover:neon-border transition-all text-xs"
                >
                  <Pencil className="h-3 w-3" /> Edit profile
                </Link>
              </div>
            </div>
            <div className="glass rounded-xl p-3 w-full sm:w-auto">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Wallet
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Wallet className="h-3.5 w-3.5 text-[var(--neon)]" />
                <span className="font-mono text-sm" data-testid="profile-wallet-short">
                  {walletAddress ? shortAddress(walletAddress) : "—"}
                </span>
                {walletAddress && (
                  <button
                    onClick={handleCopy}
                    data-testid="profile-copy-btn"
                    className="text-muted-foreground hover:text-white"
                    aria-label="Copy wallet address"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-[var(--neon)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
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
                  className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[var(--neon)]"
                >
                  View on Mantlescan <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4" data-testid="profile-stats">
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

        {/* Listed ideas */}
        {profile?.role !== "investor" && (
          <div className="glass rounded-2xl p-6" data-testid="profile-ideas-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">Your ideas</h2>
              <Link
                to="/dashboard/new-idea"
                className="text-xs text-[var(--neon)] hover:underline"
                data-testid="profile-add-idea-link"
              >
                + Add new
              </Link>
            </div>
            {ownerIdeas.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                No ideas yet. List your first idea to get discovered by investors.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {ownerIdeas.map((idea) => (
                  <Link
                    key={idea.id}
                    to="/dashboard"
                    data-testid={`profile-idea-${idea.id}`}
                    className="glass rounded-xl p-4 hover:neon-border transition-all"
                  >
                    <div className="text-[10px] text-muted-foreground">{idea.industry}</div>
                    <div className="font-display font-bold mt-0.5">{idea.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {idea.tagline}
                    </div>
                    <div className="mt-3 text-xs text-[var(--neon)] font-mono">
                      {idea.ask} • {idea.equity} equity
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Proof of Funding */}
        <div className="glass rounded-2xl p-6" data-testid="profile-pof-section">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-[var(--neon)]" />
            <h2 className="font-display font-bold">Proof of Funding</h2>
          </div>
          {dealMatches.length === 0 ? (
            <div className="rounded-2xl p-5 border border-dashed border-white/10 grid place-content-center text-center min-h-[120px]">
              <div className="text-xs text-muted-foreground">
                Close your first deal to mint a soulbound proof badge.
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {dealMatches.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl p-5 bg-gradient-to-br from-[var(--neon)]/20 to-transparent neon-border"
                  data-testid={`pof-card-${m.id}`}
                >
                  <Award className="h-7 w-7 text-[var(--neon)]" />
                  <div className="mt-4 font-display font-bold">Nexis Match · {m.ideaName}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.founderName}</div>
                  <div className="text-[10px] text-[var(--neon)] mt-3 font-mono">
                    Soulbound · Mantle Sepolia
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
    <div className="glass rounded-2xl p-5" data-testid={testId}>
      <div className="font-display text-3xl font-bold text-[var(--neon)]">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
