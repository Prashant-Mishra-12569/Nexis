import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/nexis/AppShell";
import { PublicProfileModal } from "@/components/nexis/PublicProfileModal";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Send,
  Sparkles,
  Check,
  X,
  Award,
  Loader2,
  Lock,
  MessageSquare,
  Wallet,
  Hourglass,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNexisData, type Match, type Idea } from "@/hooks/useNexisData";
import { getInitials, shortAddress } from "@/lib/tableland/profiles";
import { useRequestDealConfirmation, useConfirmDeal } from "@/lib/web3/hooks";
import { createDealNFTMetadata } from "@/lib/web3/pinata";
import {
  initXMTP,
  sendMessage as xmtpSend,
  getMessages as xmtpGetMessages,
  streamMessages,
  getXMTPClient,
  canMessageAddress,
  type XMTPMessage,
} from "@/lib/web3/xmtp";
import { useWalletClient } from "wagmi";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { isAuthenticated, walletAddress, login } = useAuth();
  const {
    myProfile,
    myRole,
    matches,
    ideas,
    acceptMatch,
    declineMatch,
    updateMatch,
    refreshMatches,
    tablesReady,
    getProfile,
  } = useNexisData();
  const { data: walletClient } = useWalletClient();

  const {
    requestDeal,
    dealId: requestedDealId,
    isPending: isRequestingDeal,
    isConfirming: isConfirmingRequest,
    isSuccess: dealRequested,
    error: dealError,
  } = useRequestDealConfirmation();
  const {
    confirmDeal,
    isPending: isConfirmPending,
    isConfirming: isConfirmMining,
    isSuccess: dealConfirmed,
    error: confirmError,
  } = useConfirmDeal();

  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<XMTPMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingMetadata, setPendingMetadata] = useState(false);
  const [profileWallet, setProfileWallet] = useState<string | null>(null);
  const [xmtpReady, setXmtpReady] = useState(false);
  const [xmtpInitializing, setXmtpInitializing] = useState(false);
  const [xmtpError, setXmtpError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingDealMatchId, setPendingDealMatchId] = useState<string | null>(null);
  const [counterpartyProfiles, setCounterpartyProfiles] = useState<Record<string, { name: string; initials: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamCleanupRef = useRef<(() => void) | null>(null);

  // Auto-select first match
  useEffect(() => {
    if (!active && matches.length > 0) {
      setActive(matches[0].id);
    }
  }, [matches, active]);

  // Initialize XMTP
  const initializeXMTP = useCallback(async () => {
    if (!walletClient || !walletAddress || xmtpReady) return;
    setXmtpInitializing(true);
    setXmtpError(null);
    try {
      await initXMTP(walletAddress, async (message: string) => {
        const sig = await walletClient.signMessage({ message });
        return sig;
      });
      setXmtpReady(true);
    } catch (e) {
      console.error("XMTP init error:", e);
      setXmtpError(e instanceof Error ? e.message : "Failed to initialize XMTP");
    } finally {
      setXmtpInitializing(false);
    }
  }, [walletClient, walletAddress, xmtpReady]);

  // Auto-init XMTP when wallet is available
  useEffect(() => {
    if (walletClient && walletAddress && !xmtpReady && !xmtpInitializing) {
      initializeXMTP();
    }
  }, [walletClient, walletAddress, xmtpReady, xmtpInitializing, initializeXMTP]);

  // Load counterparty profiles for the match list
  useEffect(() => {
    if (!walletAddress) return;
    const loadProfiles = async () => {
      const profiles: Record<string, { name: string; initials: string }> = {};
      for (const m of matches) {
        const counterW =
          m.builderWallet.toLowerCase() === walletAddress.toLowerCase()
            ? m.investorWallet
            : m.builderWallet;
        if (!counterW || profiles[counterW.toLowerCase()]) continue;
        try {
          const p = await getProfile(counterW);
          if (p) {
            profiles[counterW.toLowerCase()] = {
              name: p.name || shortAddress(counterW),
              initials: getInitials(p, counterW),
            };
          } else {
            profiles[counterW.toLowerCase()] = {
              name: shortAddress(counterW),
              initials: counterW.slice(2, 4).toUpperCase(),
            };
          }
        } catch {
          profiles[counterW.toLowerCase()] = {
            name: shortAddress(counterW),
            initials: counterW.slice(2, 4).toUpperCase(),
          };
        }
      }
      setCounterpartyProfiles(profiles);
    };
    loadProfiles();
  }, [matches, walletAddress, getProfile]);

  const current = useMemo(() => matches.find((m) => m.id === active) ?? null, [matches, active]);
  const currentIdea = useMemo(
    () => (current ? (ideas.find((i) => i.id === current.ideaId) ?? null) : null),
    [current, ideas],
  );
  const iAmBuilder =
    !!current && walletAddress && current.builderWallet?.toLowerCase() === walletAddress.toLowerCase();
  const iAmInvestor =
    !!current && walletAddress && current.investorWallet?.toLowerCase() === walletAddress.toLowerCase();
  const counterpartyWallet = iAmBuilder ? current?.investorWallet : current?.builderWallet;
  const cpKey = counterpartyWallet?.toLowerCase() || "";
  const counterpartyName = counterpartyProfiles[cpKey]?.name || (iAmBuilder ? `Investor ${current?.investorWallet?.slice(0, 6)}…` : current?.builderName) || "Counterparty";
  const counterpartyInitials = counterpartyProfiles[cpKey]?.initials || counterpartyWallet?.slice(2, 4)?.toUpperCase() || "??";

  const isAccepted = current?.status === "accepted";
  const isPending = current?.status === "pending";

  // Load messages for active match via XMTP
  useEffect(() => {
    if (!active || !xmtpReady || !counterpartyWallet) {
      setMessages([]);
      return;
    }
    // Load existing messages
    xmtpGetMessages(counterpartyWallet).then(setMessages).catch(console.error);

    // Stream new messages
    streamCleanupRef.current?.();
    streamMessages(counterpartyWallet, (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }).then((cleanup) => {
      streamCleanupRef.current = cleanup;
    });

    return () => {
      streamCleanupRef.current?.();
    };
  }, [active, xmtpReady, counterpartyWallet]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark match read
  useEffect(() => {
    if (!active || !current?.unread) return;
    updateMatch(active, { unread: false }).catch(console.error);
  }, [active, current, updateMatch]);

  // After deal request tx mines, stamp the dealId on the match
  useEffect(() => {
    if (!dealRequested || !requestedDealId || !pendingDealMatchId) return;
    updateMatch(pendingDealMatchId, {
      dealStatus: "requested",
      dealId: requestedDealId,
    }).catch(console.error);
    setPendingDealMatchId(null);
    refreshMatches();
  }, [dealRequested, requestedDealId, pendingDealMatchId, updateMatch, refreshMatches]);

  // After investor confirms deal, mark confirmed
  useEffect(() => {
    if (!dealConfirmed || !active) return;
    updateMatch(active, { dealStatus: "confirmed" }).catch(console.error);
    refreshMatches();
  }, [dealConfirmed, active, updateMatch, refreshMatches]);

  async function send() {
    if (!input.trim() || !counterpartyWallet || sending) return;
    setSending(true);
    try {
      if (xmtpReady) {
        const sent = await xmtpSend(counterpartyWallet, input);
        if (sent) {
          // Refresh messages
          const msgs = await xmtpGetMessages(counterpartyWallet);
          setMessages(msgs);
          // Update last message on match
          if (active) {
            updateMatch(active, { lastMessage: input }).catch(console.error);
          }
        }
      }
      setInput("");
    } catch (e) {
      console.error("Send failed:", e);
    } finally {
      setSending(false);
    }
  }

  async function handleAccept() {
    if (!active) return;
    await acceptMatch(active);
    // Send a system message via XMTP
    if (xmtpReady && counterpartyWallet) {
      await xmtpSend(
        counterpartyWallet,
        `${myProfile?.name || "Builder"} accepted the interest. Let's chat!`,
      );
    }
    refreshMatches();
  }

  async function handleDecline() {
    if (!active) return;
    await declineMatch(active);
    refreshMatches();
    setActive(matches.find((m) => m.id !== active)?.id ?? null);
  }

  async function handleRequestDealNFT() {
    if (!walletAddress || !current || !iAmBuilder) return;
    setPendingMetadata(true);
    try {
      const investorAddress =
        current.investorWallet?.startsWith("0x") && current.investorWallet.length >= 42
          ? current.investorWallet
          : "0x000000000000000000000000000000000000dEaD";

      const metadataResult = await createDealNFTMetadata({
        startupName: current.ideaName,
        builderAddress: walletAddress,
        investorAddress,
        date: new Date().toISOString().split("T")[0],
        industry: currentIdea?.industry || "Other",
      });

      if (!metadataResult.success || !metadataResult.ipfsUrl) {
        console.error("Metadata upload failed", metadataResult.error);
        setPendingMetadata(false);
        return;
      }

      // Send deal request via XMTP
      if (xmtpReady && counterpartyWallet) {
        await xmtpSend(
          counterpartyWallet,
          `🏆 ${myProfile?.name || "Builder"} has requested a Deal NFT confirmation for "${current.ideaName}". Please confirm on-chain to mint the soulbound badge.`,
        );
      }

      setPendingDealMatchId(current.id);
      requestDeal(investorAddress, current.ideaName, metadataResult.ipfsUrl);
    } catch (error) {
      console.error("Failed to request deal NFT:", error);
    } finally {
      setPendingMetadata(false);
    }
  }

  function handleConfirmDeal() {
    if (!current?.dealId) {
      console.warn("Cannot confirm: dealId missing");
      return;
    }
    confirmDeal(current.dealId);
  }

  // ===== Render =====

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="px-4 md:px-8 pt-6 max-w-3xl mx-auto" data-testid="chat-auth-required">
          <div className="glass-strong rounded-3xl p-8 md:p-12 text-center neon-border">
            <Wallet className="h-12 w-12 text-[var(--neon)] mx-auto mb-4" />
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Connect to see your matches
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Conversations are end-to-end encrypted via XMTP.
            </p>
            <button
              onClick={() => login()}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-105 transition-all"
            >
              <Wallet className="h-4 w-4" /> Connect wallet
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (matches.length === 0) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4" data-testid="chat-empty">
          <div className="glass-strong rounded-3xl p-8 text-center max-w-md neon-border">
            <MessageSquare className="h-12 w-12 text-[var(--neon)] mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">
              {myRole === "investor" ? "No interests yet" : "No incoming interest"}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {myRole === "investor"
                ? "Swipe right on a startup to express interest. The builder will see it and can accept."
                : "Once an investor swipes right on one of your ideas, they'll appear here for you to accept or decline."}
            </p>
            <Link
              to={myRole === "investor" ? "/feed" : "/dashboard/new-idea"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
            >
              {myRole === "investor" ? "Start swiping" : "Add new idea"}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!current) return null;

  return (
    <AppShell>
      <div className="md:px-8 md:pt-6 max-w-6xl mx-auto" data-testid="chat-page">
        <div className="grid md:grid-cols-[300px_1fr] gap-0 md:gap-6 h-[calc(100vh-180px)] md:h-[calc(100vh-140px)]">
          {/* Matches sidebar */}
          <div className="glass md:rounded-2xl overflow-hidden border-y md:border border-white/5">
            <div className="p-4 border-b border-white/5">
              <div className="text-xs text-[var(--neon)] uppercase tracking-widest">
                {myRole === "investor" ? "Your interests" : "Inbound interest"}
              </div>
              <div className="font-display text-lg font-bold">Inbox</div>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
              {matches.map((m) => {
                const counterW =
                  walletAddress && m.builderWallet.toLowerCase() === walletAddress.toLowerCase()
                    ? m.investorWallet
                    : m.builderWallet;
                const ck = counterW?.toLowerCase() || "";
                const nm = counterpartyProfiles[ck]?.name || shortAddress(counterW);
                const ini = counterpartyProfiles[ck]?.initials || counterW?.slice(2, 4)?.toUpperCase() || "??";
                return (
                  <button
                    key={m.id}
                    onClick={() => setActive(m.id)}
                    className={`w-full flex items-start gap-3 p-4 border-b border-white/5 text-left transition-colors ${
                      active === m.id ? "bg-[var(--neon)]/5" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--neon)]/40 to-emerald-900 grid place-content-center text-xs font-bold shrink-0">
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm truncate">{nm}</div>
                        {m.unread && (
                          <span className="h-2 w-2 rounded-full bg-[var(--neon)] shrink-0 shadow-[0_0_8px_rgba(0,255,157,0.8)]" />
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--neon)] flex items-center gap-1.5">
                        {m.ideaName}
                        {m.status === "pending" && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px]">
                            PENDING
                          </span>
                        )}
                        {m.dealStatus === "confirmed" && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[var(--neon)]/20 text-[var(--neon)] text-[9px]">
                            NFT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {m.lastMessage || "New interest"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat area */}
          <div className="glass md:rounded-2xl flex flex-col overflow-hidden border-y md:border border-white/5">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <button
                onClick={() => counterpartyWallet && setProfileWallet(counterpartyWallet)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--neon)]/40 to-emerald-900 grid place-content-center text-xs font-bold">
                  {counterpartyInitials}
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{counterpartyName}</div>
                  <div className="text-[11px] text-[var(--neon)]">
                    re: {current.ideaName}
                    {currentIdea && (
                      <span className="text-muted-foreground ml-2">• {currentIdea.industry}</span>
                    )}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-2">
                {/* XMTP status indicator */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] ${
                    xmtpReady
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  {xmtpReady ? "E2E" : "Connecting…"}
                </div>

                {/* Deal NFT request — BUILDER ONLY */}
                {iAmBuilder && isAccepted && current.dealStatus !== "confirmed" && (
                  <button
                    onClick={handleRequestDealNFT}
                    disabled={
                      pendingMetadata || isRequestingDeal || isConfirmingRequest || current.dealStatus === "requested"
                    }
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full neon-border text-[var(--neon)] text-xs hover:bg-[var(--neon)] hover:text-black transition-all disabled:opacity-50"
                  >
                    {pendingMetadata || isRequestingDeal || isConfirmingRequest ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {pendingMetadata ? "Pinning…" : isRequestingDeal ? "Confirm…" : "Mining…"}
                      </>
                    ) : current.dealStatus === "requested" ? (
                      <>
                        <Hourglass className="h-3.5 w-3.5" /> Awaiting investor
                      </>
                    ) : (
                      <>
                        <Award className="h-3.5 w-3.5" /> Request Deal NFT
                      </>
                    )}
                  </button>
                )}

                {/* Investor sees "Confirm Deal" button when requested */}
                {iAmInvestor && current.dealStatus === "requested" && (
                  <button
                    onClick={handleConfirmDeal}
                    disabled={isConfirmPending || isConfirmMining || !current.dealId}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--neon)] text-black text-xs font-semibold hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isConfirmPending || isConfirmMining ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {isConfirmPending ? "Confirm…" : "Minting…"}
                      </>
                    ) : !current.dealId ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for receipt…
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Confirm & Mint NFT
                      </>
                    )}
                  </button>
                )}

                {current.dealStatus === "confirmed" && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--neon)]/10 text-[var(--neon)] text-xs neon-border">
                    <Check className="h-3.5 w-3.5" /> Deal NFT minted
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {/* Builder Accept/Decline prompt */}
              {iAmBuilder && isPending && (
                <div className="glass-strong rounded-2xl p-5 neon-border text-center space-y-3">
                  <Sparkles className="h-6 w-6 text-[var(--neon)] mx-auto" />
                  <div className="font-display font-bold">
                    {counterpartyName} swiped right on {current.ideaName}.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Accept to open the chat and explore the deal. Decline to remove this interest.
                  </div>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={handleAccept}
                      className="px-5 py-2 rounded-full bg-[var(--neon)] text-black font-semibold text-sm flex items-center gap-1.5 hover:scale-105 transition-all"
                    >
                      <Check className="h-4 w-4" /> Accept
                    </button>
                    <button
                      onClick={handleDecline}
                      className="px-5 py-2 rounded-full border border-rose-500/40 text-rose-400 text-sm flex items-center gap-1.5 hover:bg-rose-500/10 transition-all"
                    >
                      <X className="h-4 w-4" /> Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Investor waiting state */}
              {iAmInvestor && isPending && (
                <div className="glass-strong rounded-2xl p-5 neon-border text-center space-y-3">
                  <Hourglass className="h-6 w-6 text-amber-400 mx-auto" />
                  <div className="font-display font-bold">
                    Waiting for the builder to accept your interest.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {current.builderName} will be notified. Once they accept, you can start chatting.
                  </div>
                </div>
              )}

              {/* XMTP not ready */}
              {!xmtpReady && isAccepted && (
                <div className="glass rounded-2xl p-4 text-center space-y-2 border border-amber-500/30">
                  {xmtpInitializing ? (
                    <>
                      <Loader2 className="h-5 w-5 text-amber-400 mx-auto animate-spin" />
                      <p className="text-xs text-amber-300">Initializing E2E encryption…</p>
                    </>
                  ) : xmtpError ? (
                    <>
                      <p className="text-xs text-rose-400">{xmtpError}</p>
                      <button
                        onClick={initializeXMTP}
                        className="text-xs text-[var(--neon)] hover:underline"
                      >
                        Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 text-amber-400 mx-auto" />
                      <p className="text-xs text-amber-300">Setting up XMTP encryption…</p>
                    </>
                  )}
                </div>
              )}

              {/* Messages from XMTP */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.isFromMe
                        ? "bg-[var(--neon)]/10 text-[var(--neon)] neon-border"
                        : "bg-white/5 text-white border border-white/10"
                    }`}
                  >
                    {msg.content}
                    <div className="text-[9px] text-muted-foreground mt-1 text-right">
                      {msg.sent.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Deal status cards */}
              {current.dealStatus === "requested" && (
                <div className="flex justify-center">
                  <div className="max-w-md w-full glass-strong rounded-2xl p-5 neon-border space-y-3 text-center">
                    <Award className="h-6 w-6 text-[var(--neon)] mx-auto" />
                    <div className="font-display font-bold text-sm">Deal NFT Requested</div>
                    <div className="text-xs text-muted-foreground">
                      {iAmBuilder
                        ? "Waiting for investor to confirm the deal on-chain…"
                        : "The builder has requested a Deal NFT. Confirm to mint."}
                    </div>
                    {iAmInvestor && (
                      <button
                        onClick={handleConfirmDeal}
                        disabled={isConfirmPending || isConfirmMining || !current.dealId}
                        className="px-5 py-2 rounded-full bg-[var(--neon)] text-black text-sm font-semibold flex items-center gap-2 mx-auto hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {isConfirmPending || isConfirmMining ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {isConfirmPending ? "Confirm in wallet…" : "Minting…"}
                          </>
                        ) : !current.dealId ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for receipt…
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" /> Confirm & Mint NFT
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {current.dealStatus === "confirmed" && (
                <div className="flex justify-center">
                  <div className="max-w-md w-full glass-strong rounded-2xl p-5 neon-border space-y-2 text-center">
                    <Award className="h-6 w-6 text-[var(--neon)] mx-auto" />
                    <div className="font-display font-bold text-sm text-[var(--neon)]">
                      Deal NFT Minted! 🎉
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Soulbound proof-of-funding badge has been minted to the builder.
                    </div>
                  </div>
                </div>
              )}

              {(dealError || confirmError) && (
                <div className="glass rounded-xl p-3 text-xs text-rose-400 border border-rose-500/30">
                  {(dealError || confirmError)?.message}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {isAccepted && (
              <div className="p-3 md:p-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-3 w-3 text-[var(--neon)]" />
                  <span className="text-[10px] text-muted-foreground">
                    {xmtpReady ? "End-to-end encrypted via XMTP" : "Messages signed by your wallet"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Type a message…"
                    disabled={!xmtpReady}
                    className="flex-1 bg-white/5 rounded-full px-5 py-3 text-sm outline-none border border-white/5 focus:border-[var(--neon)]/40 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || !xmtpReady || sending}
                    aria-label="Send message"
                    className="h-11 w-11 rounded-full bg-[var(--neon)] text-black grid place-content-center neon-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <PublicProfileModal walletAddress={profileWallet} onClose={() => setProfileWallet(null)} />
    </AppShell>
  );
}
