import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Layers, MessageCircle, User, Zap, Search, Bell, LogOut, Wallet } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbs } from "./Orbs";
import { WrongNetworkBanner } from "./NetworkGuard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsVerifiedBuilder } from "@/lib/web3/hooks";
import { useNexisData, type Idea } from "@/hooks/useNexisData";
import { getInitials, shortAddress } from "@/lib/tableland/profiles";

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
  const { myProfile: profile, matches, ideas: allIdeas, tablesReady } = useNexisData();
  const unreadMatches = useMemo(() => matches.filter((m) => m.unread).length, [matches]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  // Auto-redirect new wallets (no local profile + not verified on-chain) to onboarding
  useEffect(() => {
    if (!isAuthenticated || !walletAddress) return;
    const onAuthRoute = pathname === "/onboarding" || pathname === "/" || pathname === "/setup";
    if (onAuthRoute) return;
    if (!tablesReady) return; // tables not yet set up
    if (profile) return; // already onboarded
    if (isVerifiedOnChain) return;
    navigate({ to: "/onboarding" });
  }, [isAuthenticated, walletAddress, pathname, isVerifiedOnChain, navigate, profile, tablesReady]);

  const initials = getInitials(profile, walletAddress);
  const recentMatches = useMemo(() => matches.slice(0, 5), [matches]);
  
  const filteredNavItems = useMemo(() => {
    if (profile?.role === "builder") {
      return navItems.filter((it) => it.to !== "/feed");
    }
    return navItems;
  }, [profile]);

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
    <div className="min-h-screen relative bg-transparent text-white antialiased">
      <Orbs />
      <WrongNetworkBanner />

      {/* Desktop Floating Sidebar */}
      <aside className="hidden md:flex fixed left-4 top-4 bottom-4 w-60 flex-col border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl z-30 p-5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <Link to="/" className="flex items-center gap-3 mb-8 px-2" data-testid="sidebar-logo">
          <div className="h-9 w-9 rounded-xl bg-[#00ff9d] grid place-content-center shadow-[0_0_15px_rgba(0,255,157,0.4)]">
            <Zap className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-black tracking-tight text-white">Nexis</span>
        </Link>
        
        <nav className="flex flex-col gap-1.5 flex-1">
          {filteredNavItems.map((it) => {
            const active = pathname.startsWith(it.to);
            const Icon = it.icon;
            const showBadge = it.to === "/chat" && unreadMatches > 0;
            return (
              <Link
                key={it.to}
                to={it.to}
                data-testid={it.testId}
                className={cn(
                  "relative flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group overflow-hidden",
                  active
                    ? "text-[#00ff9d]"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeNavBg"
                    className="absolute inset-0 bg-[#00ff9d]/8 border border-[#00ff9d]/20 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="flex items-center gap-3 relative z-10">
                  <Icon className={cn("h-4.5 w-4.5 transition-transform group-hover:scale-110", active && "drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]")} />
                  {it.label}
                </span>
                {showBadge && (
                  <span className="relative z-10 h-5 min-w-[20px] px-1.5 rounded-full bg-[#00ff9d] text-black text-[10px] font-black grid place-content-center shadow-[0_0_10px_rgba(0,255,157,0.5)]">
                    {unreadMatches}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto relative z-10">
          <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-2xl p-4 shadow-inner">
            {isAuthenticated && walletAddress ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Connected wallet</div>
                <div className="text-sm font-mono mt-1 font-bold text-white/95" data-testid="sidebar-wallet">
                  {shortAddress(walletAddress)}
                </div>
                <div
                  className="text-xs font-semibold text-[#00ff9d] mt-1"
                  data-testid="sidebar-balance"
                >
                  {balance || "0 MNT"}
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff9d]" />
                    </span>
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-wide">Mantle Sepolia</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    data-testid="sidebar-logout-btn"
                    className="text-white/40 hover:text-rose-400 hover:scale-110 transition-all cursor-pointer"
                    aria-label="Disconnect wallet"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => login()}
                disabled={isLoading}
                data-testid="sidebar-connect-btn"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ff9d] text-black text-sm font-bold shadow-[0_0_20px_rgba(0,255,157,0.35)] hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Wallet className="h-4 w-4" /> {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Top Floating Header */}
      <header className="mx-4 mt-4 md:mx-0 md:ml-[272px] md:mr-4 md:mt-4 sticky top-4 z-20 px-6 py-4 flex items-center justify-between border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2 md:hidden">
          <Link to="/" className="flex items-center gap-2.5" data-testid="topbar-logo">
            <div className="h-8.5 w-8.5 rounded-lg bg-[#00ff9d] grid place-content-center shadow-[0_0_10px_rgba(0,255,157,0.4)]">
              <Zap className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
            </div>
            <span className="font-display font-black text-lg text-white">Nexis</span>
          </Link>
        </div>

        {/* Premium Search */}
        <div className="hidden md:flex relative items-center flex-1 max-w-md">
          <Search className="absolute left-3.5 h-4 w-4 text-white/40 pointer-events-none" />
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
            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] focus:bg-white/[0.06] rounded-full border border-white/10 focus:border-[#00ff9d]/30 focus:shadow-[0_0_15px_rgba(0,255,157,0.1)] outline-none text-sm transition-all text-white placeholder-white/30 font-medium"
          />
          <AnimatePresence>
            {searchOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-3 bg-[#0a0c0b]/95 backdrop-blur-xl rounded-2xl border border-white/15 max-h-80 overflow-y-auto z-50 shadow-2xl p-2"
                data-testid="topbar-search-results"
              >
                {searchResults.map((idea) => (
                  <Link
                    key={idea.id}
                    to="/feed"
                    className="flex items-center gap-3.5 p-2.5 hover:bg-[#00ff9d]/5 rounded-xl transition-all group"
                    data-testid={`search-result-${idea.id}`}
                  >
                    <img src={idea.image} className="h-9.5 w-9.5 rounded-lg object-cover border border-white/10" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-white/90 group-hover:text-[#00ff9d] transition-colors">{idea.name}</div>
                      <div className="text-[11px] text-white/50 truncate mt-0.5">
                        {idea.industry} • {idea.founder}
                      </div>
                    </div>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Notifications Button */}
          <button
            onClick={() => setNotifOpen((v) => !v)}
            data-testid="topbar-notif-btn"
            className="h-9.5 w-9.5 grid place-content-center rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#00ff9d]/30 transition-all relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadMatches > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#00ff9d] shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
            )}
          </button>
          
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full right-0 mt-3 w-80 bg-[#0a0c0b]/95 backdrop-blur-xl rounded-2xl border border-white/15 overflow-hidden z-50 shadow-2xl"
                data-testid="topbar-notif-dropdown"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-[#00ff9d] font-bold">
                    Notifications
                  </div>
                  {unreadMatches > 0 && (
                    <span className="text-[10px] font-bold bg-[#00ff9d]/10 text-[#00ff9d] px-2 py-0.5 rounded-full">{unreadMatches} unread</span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto p-1">
                  {recentMatches.length === 0 ? (
                    <div className="py-8 px-4 text-center text-xs text-white/40">
                      No notifications yet. Start swiping in the feed!
                    </div>
                  ) : (
                    recentMatches.map((m) => (
                      <Link
                        key={m.id}
                        to="/chat"
                        onClick={() => setNotifOpen(false)}
                        data-testid={`notif-${m.id}`}
                        className="flex items-start gap-3 p-3 hover:bg-[#00ff9d]/5 rounded-xl transition-all"
                      >
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00ff9d]/30 to-emerald-950 border border-[#00ff9d]/20 grid place-content-center text-xs font-bold shrink-0 text-[#00ff9d]">
                          {m.builderAvatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate text-white/90">{m.builderName}</div>
                          <div className="text-[10px] text-[#00ff9d] font-bold mt-0.5">{m.ideaName}</div>
                          <div className="text-xs text-white/60 truncate mt-1">
                            {m.lastMessage}
                          </div>
                        </div>
                        {m.unread && <span className="h-2 w-2 rounded-full bg-[#00ff9d] mt-2 shadow-[0_0_6px_rgba(0,255,157,0.5)]" />}
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Avatar */}
          <Link
            to="/profile"
            data-testid="topbar-avatar-link"
            className="h-9.5 w-9.5 rounded-full bg-gradient-to-br from-[#00ff9d] to-emerald-800 border border-white/20 grid place-content-center text-xs font-black text-black overflow-hidden shadow-[0_0_10px_rgba(0,255,157,0.2)] hover:scale-105 transition-all"
          >
            {profile?.profilePicUrl ? (
              <img src={profile.profilePicUrl} alt="me" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </Link>
        </div>
      </header>

      {/* Main Page Area */}
      <main
        className={cn(
          "md:ml-[272px] md:mr-4 mt-6 pb-24 md:pb-8 min-h-[calc(100vh-140px)]",
          !hideRightPanel && rightPanel ? "xl:mr-[392px]" : "",
        )}
      >
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>

      {/* Right Side Panel */}
      {rightPanel && !hideRightPanel && (
        <aside className="hidden xl:flex fixed right-4 top-4 bottom-4 w-[360px] border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl z-20 pt-20 p-6 overflow-y-auto rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="w-full">
            {rightPanel}
          </div>
        </aside>
      )}

      {/* Mobile Floating Bottom Nav */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 z-30 border border-white/[0.08] bg-[#090b0a]/80 backdrop-blur-lg rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <div className={cn("grid", profile?.role === "builder" ? "grid-cols-3" : "grid-cols-4")}>
          {filteredNavItems.map((it) => {
            const active = pathname.startsWith(it.to);
            const Icon = it.icon;
            const showBadge = it.to === "/chat" && unreadMatches > 0;
            return (
              <Link
                key={it.to}
                to={it.to}
                data-testid={`mobile-${it.testId}`}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1.5 py-3 text-[10px] font-bold tracking-wide uppercase transition-all duration-300",
                  active ? "text-[#00ff9d]" : "text-white/50",
                )}
              >
                <Icon
                  className={cn("h-5 w-5 transition-transform", active && "drop-shadow-[0_0_8px_rgba(0,255,157,0.7)] scale-110")}
                />
                {it.label}
                {showBadge && (
                  <span className="absolute top-2 right-1/4 h-4 min-w-[16px] px-1 rounded-full bg-[#00ff9d] text-black text-[9px] font-black grid place-content-center shadow-[0_0_5px_rgba(0,255,157,0.6)]">
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

