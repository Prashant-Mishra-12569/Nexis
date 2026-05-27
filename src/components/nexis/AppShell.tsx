import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Layers, MessageCircle, User, Zap, Search, Bell, LogOut, Wallet } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Orbs } from "./Orbs";
import { WrongNetworkBanner } from "./NetworkGuard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsVerifiedBuilder } from "@/lib/web3/hooks";
import { getProfile, getInitials, shortAddress, type UserProfile } from "@/lib/nexis/profileStore";
import { getMatches, getIdeas, type Idea } from "@/lib/nexis/ideasStore";

const navItems = [
  { to: "/feed", label: "Swipe", icon: Layers, testId: "nav-feed" },
  { to: "/dashboard", label: "Dashboard", icon: Home, testId: "nav-dashboard" },
  { to: "/chat", label: "Chat", icon: MessageCircle, testId: "nav-chat" },
  { to: "/profile", label: "Profile", icon: User, testId: "nav-profile" },
];

export function AppShell({
  children,
  hideRightPanel = false,
  rightPanel,
}: {
  children: React.ReactNode;
  hideRightPanel?: boolean;
  rightPanel?: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, walletAddress, balance, login, logout, isLoading } = useAuth();
  const { data: isVerifiedOnChain } = useIsVerifiedBuilder(walletAddress || undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unreadMatches, setUnreadMatches] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [allIdeas, setAllIdeas] = useState<Idea[]>([]);

  useEffect(() => {
    setProfile(getProfile(walletAddress));
    setUnreadMatches(getMatches().filter((m) => m.unread).length);
    setAllIdeas(getIdeas());

    // Refresh on route changes & storage events
    const onStorage = () => {
      setProfile(getProfile(walletAddress));
      setUnreadMatches(getMatches().filter((m) => m.unread).length);
      setAllIdeas(getIdeas());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [walletAddress, pathname]);

  // Auto-redirect new wallets (no local profile + not verified on-chain) to onboarding
  // so they pick a role before landing in builder/investor flows.
  useEffect(() => {
    if (!isAuthenticated || !walletAddress) return;
    const onAuthRoute = pathname === "/onboarding" || pathname === "/";
    if (onAuthRoute) return;
    const localProfile = getProfile(walletAddress);
    if (localProfile) return; // already onboarded
    if (isVerifiedOnChain) return; // on-chain verified builder (legacy/external) — let them in
    navigate({ to: "/onboarding" });
  }, [isAuthenticated, walletAddress, pathname, isVerifiedOnChain, navigate]);

  const initials = getInitials(profile, walletAddress);
  const recentMatches = useMemo(() => getMatches().slice(0, 5), [unreadMatches]); // eslint-disable-line react-hooks/exhaustive-deps
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [] as Idea[];
    return allIdeas
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.tagline.toLowerCase().includes(q) ||
          i.industry.toLowerCase().includes(q) ||
          i.founder.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [searchQ, allIdeas]);

  return (
    <div className="min-h-screen relative">
      <Orbs />
      <WrongNetworkBanner />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col border-r border-white/5 glass-strong z-30 p-5">
        <Link to="/" className="flex items-center gap-2 mb-10" data-testid="sidebar-logo">
          <div className="h-9 w-9 rounded-xl bg-[var(--neon)] grid place-content-center neon-glow">
            <Zap className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Nexis</span>
        </Link>
        <nav className="flex flex-col gap-1.5">
          {navItems.map((it) => {
            const active = pathname.startsWith(it.to);
            const Icon = it.icon;
            const showBadge = it.to === "/chat" && unreadMatches > 0;
            return (
              <Link
                key={it.to}
                to={it.to}
                data-testid={it.testId}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-[var(--neon)]/10 text-[var(--neon)] neon-border"
                    : "text-muted-foreground hover:text-white hover:bg-white/5",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {it.label}
                </span>
                {showBadge && (
                  <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--neon)] text-black text-[10px] font-bold grid place-content-center">
                    {unreadMatches}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <div className="glass rounded-xl p-4">
            {isAuthenticated && walletAddress ? (
              <>
                <div className="text-xs text-muted-foreground">Connected wallet</div>
                <div className="text-sm font-mono mt-1" data-testid="sidebar-wallet">
                  {shortAddress(walletAddress)}
                </div>
                <div
                  className="text-[10px] text-muted-foreground mt-1"
                  data-testid="sidebar-balance"
                >
                  {balance || "0 MNT"}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon)] animate-pulse" />
                    <span className="text-xs text-[var(--neon)]">Mantle Sepolia</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    data-testid="sidebar-logout-btn"
                    className="text-muted-foreground hover:text-rose-400 transition-colors"
                    aria-label="Disconnect wallet"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => login()}
                disabled={isLoading}
                data-testid="sidebar-connect-btn"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--neon)] text-black text-sm font-semibold hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                <Wallet className="h-3.5 w-3.5" /> {isLoading ? "Loading..." : "Connect"}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="md:ml-[240px] sticky top-0 z-20 px-4 md:px-8 py-4 flex items-center justify-between glass-strong border-b border-white/5">
        <div className="flex items-center gap-2 md:hidden">
          <Link to="/" className="flex items-center gap-2" data-testid="topbar-logo">
            <div className="h-8 w-8 rounded-lg bg-[var(--neon)] grid place-content-center">
              <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold">Nexis</span>
          </Link>
        </div>

        {/* Search */}
        <div className="hidden md:flex relative items-center flex-1 max-w-md">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Search ideas, builders, industries…"
            data-testid="topbar-search-input"
            className="w-full pl-9 pr-4 py-2 bg-white/5 rounded-full border border-white/10 focus:border-[var(--neon)]/50 outline-none text-sm"
          />
          {searchOpen && searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-2xl border border-white/10 max-h-80 overflow-y-auto z-50"
              data-testid="topbar-search-results"
            >
              {searchResults.map((idea) => (
                <Link
                  key={idea.id}
                  to="/feed"
                  className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                  data-testid={`search-result-${idea.id}`}
                >
                  <img src={idea.image} className="h-9 w-9 rounded-lg object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{idea.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {idea.industry} • {idea.founder}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            data-testid="topbar-notif-btn"
            className="h-9 w-9 grid place-content-center rounded-full glass hover:neon-border transition-all relative"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadMatches > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--neon)]" />
            )}
          </button>
          {notifOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-80 glass-strong rounded-2xl border border-white/10 overflow-hidden z-50"
              data-testid="topbar-notif-dropdown"
            >
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-[var(--neon)]">
                  Notifications
                </div>
                {unreadMatches > 0 && (
                  <span className="text-[10px] text-muted-foreground">{unreadMatches} unread</span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentMatches.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No notifications yet. Start swiping in the feed!
                  </div>
                ) : (
                  recentMatches.map((m) => (
                    <Link
                      key={m.id}
                      to="/chat"
                      onClick={() => setNotifOpen(false)}
                      data-testid={`notif-${m.id}`}
                      className="flex items-start gap-3 p-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--neon)]/40 to-emerald-900 grid place-content-center text-xs font-bold shrink-0">
                        {m.founderAvatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{m.founderName}</div>
                        <div className="text-[11px] text-[var(--neon)]">{m.ideaName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {m.lastMessage}
                        </div>
                      </div>
                      {m.unread && <span className="h-2 w-2 rounded-full bg-[var(--neon)] mt-2" />}
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          <Link
            to="/profile"
            data-testid="topbar-avatar-link"
            className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--neon)] to-emerald-700 grid place-content-center text-xs font-bold text-black overflow-hidden"
          >
            {profile?.profilePicUrl ? (
              <img src={profile.profilePicUrl} alt="me" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </Link>
        </div>
      </header>

      {/* Main + optional right panel */}
      <main
        className={cn(
          "md:ml-[240px] pb-24 md:pb-8",
          !hideRightPanel && rightPanel ? "xl:mr-[360px]" : "",
        )}
      >
        {children}
      </main>

      {rightPanel && !hideRightPanel && (
        <aside className="hidden xl:flex fixed right-0 top-0 bottom-0 w-[360px] border-l border-white/5 glass-strong z-20 pt-[72px] overflow-y-auto">
          {rightPanel}
        </aside>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-white/5">
        <div className="grid grid-cols-4">
          {navItems.map((it) => {
            const active = pathname.startsWith(it.to);
            const Icon = it.icon;
            const showBadge = it.to === "/chat" && unreadMatches > 0;
            return (
              <Link
                key={it.to}
                to={it.to}
                data-testid={`mobile-${it.testId}`}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors",
                  active ? "text-[var(--neon)]" : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(0,255,157,0.7)]")}
                />
                {it.label}
                {showBadge && (
                  <span className="absolute top-1.5 right-1/4 h-4 min-w-[16px] px-1 rounded-full bg-[var(--neon)] text-black text-[9px] font-bold grid place-content-center">
                    {unreadMatches}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
