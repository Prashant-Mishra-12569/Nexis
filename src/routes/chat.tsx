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
  ChevronRight,
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
  syncAndGetMessages,
  type XMTPMessage,
} from "@/lib/web3/xmtp";
import { useWalletClient } from "wagmi";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { isAuthenticated, walletAddress, login, primaryWallet } = useAuth();
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
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [messages, setMessages] = useState<XMTPMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingMetadata, setPendingMetadata] = useState(false);
  const [profileWallet, setProfileWallet] = useState<string | null>(null);
  const [xmtpReady, setXmtpReady] = useState(false);
  const [xmtpInitializing, setXmtpInitializing] = useState(false);
  const [xmtpError, setXmtpError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pendingDealMatchId, setPendingDealMatchId] = useState<string | null>(null);
  const [pendingTokenURI, setPendingTokenURI] = useState<string | null>(null);
  const [counterpartyProfiles, setCounterpartyProfiles] = useState<Record<string, { name: string; initials: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select first match
  useEffect(() => {
    if (!active && matches.length > 0) {
      setActive(matches[0].id);
    }
  }, [matches, active]);

  // Initialize XMTP
  const initializeXMTP = useCallback(async () => {
    const hasWallet = !!walletClient || !!primaryWallet;
    if (!hasWallet || !walletAddress || xmtpReady) return;
    setXmtpInitializing(true);
    setXmtpError(null);
    try {
      await initXMTP(walletAddress, async (message: string) => {
        if (walletClient) {
          const sig = await walletClient.signMessage({ message });
          return sig;
        } else if (primaryWallet) {
          console.log("[XMTP] Signing message with Privy primaryWallet");
          const { createWalletClient, custom } = await import("viem");
          const { mantleTestnet } = await import("@/lib/web3/config");
          const provider = await primaryWallet.getEthereumProvider();
          const client = createWalletClient({
            account: walletAddress as `0x${string}`,
            chain: mantleTestnet,
            transport: custom(provider),
          });
          const sig = await client.signMessage({ message });
          return sig;
        }
        throw new Error("No wallet client or primary wallet available to sign");
      });
      setXmtpReady(true);
    } catch (e) {
      console.error("XMTP init error:", e);
      setXmtpError(e instanceof Error ? e.message : "Failed to initialize XMTP");
    } finally {
      setXmtpInitializing(false);
    }
  }, [walletClient, primaryWallet, walletAddress, xmtpReady]);

  // Auto-init XMTP when wallet is available
  useEffect(() => {
    const hasWallet = !!walletClient || !!primaryWallet;
    if (hasWallet && walletAddress && !xmtpReady && !xmtpInitializing) {
      initializeXMTP();
    }
  }, [walletClient, primaryWallet, walletAddress, xmtpReady, xmtpInitializing, initializeXMTP]);

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

    let isCurrent = true;
    let cleanupFn: (() => void) | null = null;

    setMessagesLoading(true);

    (async () => {
      try {
        const msgs = await xmtpGetMessages(counterpartyWallet);
        if (!isCurrent) return;
        setMessages(msgs);
        setMessagesLoading(false);

        const cleanup = await streamMessages(counterpartyWallet, (msg) => {
          if (!isCurrent) return;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            const next = [...prev, msg];
            next.sort((a, b) => a.sent.getTime() - b.sent.getTime());
            return next;
          });
        });

        if (isCurrent) {
          cleanupFn = cleanup;
        } else {
          cleanup();
        }
      } catch (e) {
        console.error("Message loading error:", e);
        if (isCurrent) setMessagesLoading(false);
      }
    })();

    return () => {
      isCurrent = false;
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [active, xmtpReady, counterpartyWallet]);

  // Periodic background sync loop (every 3 seconds)
  useEffect(() => {
    if (!active || !xmtpReady || !counterpartyWallet || messagesLoading) return;

    const interval = setInterval(async () => {
      try {
        const msgs = await syncAndGetMessages(counterpartyWallet);
        setMessages((prev) => {
          const prevReal = prev.filter((m) => !m.id.startsWith("optimistic-"));
          if (
            prevReal.length === msgs.length &&
            prevReal.every((m, idx) => m.id === msgs[idx]?.id)
          ) {
            return prev;
          }

          const optimisticOnes = prev.filter((m) => m.id.startsWith("optimistic-"));
          const next = [...msgs];
          for (const opt of optimisticOnes) {
            const contentExists = next.some(
              (m) =>
                m.content === opt.content &&
                Math.abs(m.sent.getTime() - opt.sent.getTime()) < 10000,
            );
            if (!contentExists) {
              next.push(opt);
            }
          }
          next.sort((a, b) => a.sent.getTime() - b.sent.getTime());
          return next;
        });
      } catch (e) {
        console.warn("[XMTP] Periodic sync and refresh failed:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [active, xmtpReady, counterpartyWallet, messagesLoading]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark match read
  useEffect(() => {
    if (!active || !current?.unread) return;
    updateMatch(active, { unread: false }).catch(console.error);
  }, [active, current, updateMatch]);

  // After deal request tx mines, update match state
  useEffect(() => {
    if (!dealRequested || !requestedDealId || !pendingDealMatchId) return;
    updateMatch(pendingDealMatchId, {
      dealStatus: "requested",
      dealId: requestedDealId,
      dealTokenURI: pendingTokenURI || undefined,
    }).catch(console.error);
    setPendingDealMatchId(null);
    setPendingTokenURI(null);
    refreshMatches();
  }, [dealRequested, requestedDealId, pendingDealMatchId, pendingTokenURI, updateMatch, refreshMatches]);

  // After investor confirms deal, mark confirmed
  useEffect(() => {
    if (!dealConfirmed || !active) return;
    updateMatch(active, { dealStatus: "confirmed" }).catch(console.error);
    refreshMatches();
  }, [dealConfirmed, active, updateMatch, refreshMatches]);

  async function send() {
    if (!input.trim() || !counterpartyWallet || sending) return;
    const text = input.trim();
    setInput(""); 
    setSending(true);

    const optimisticMsg: XMTPMessage = {
      id: `optimistic-${Date.now()}`,
      senderAddress: "me",
      content: text,
      sent: new Date(),
      isFromMe: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      if (xmtpReady) {
        const sent = await xmtpSend(counterpartyWallet, text);
        if (sent) {
          const msgs = await xmtpGetMessages(counterpartyWallet);
          setMessages(msgs);
          if (active) {
            updateMatch(active, { lastMessage: text }).catch(console.error);
          }
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
          toast.error("Could not send message. The counterparty has not registered their chat key yet. Ask them to connect their wallet and open the Chat tab first to register.");
        }
      }
    } catch (e) {
      console.error("Send failed:", e);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast.error("Failed to send message: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSending(false);
    }
  }

  async function handleAccept() {
    if (!active) return;
    await acceptMatch(active);
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

      if (xmtpReady && counterpartyWallet) {
        await xmtpSend(
          counterpartyWallet,
          `🏆 ${myProfile?.name || "Builder"} has requested a Deal NFT confirmation for "${current.ideaName}". Please confirm on-chain to mint the soulbound badge.`,
        );
      }

      setPendingTokenURI(metadataResult.ipfsUrl);
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

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="px-4 md:px-8 pt-12 max-w-3xl mx-auto" data-testid="chat-auth-required">
          <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-8 md:p-16 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="h-16 w-16 rounded-2xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,255,157,0.15)]">
              <MessageSquare className="h-8 w-8 text-[#00ff9d]" />
            </div>
            <h2 className="font-display text-3xl font-black text-white tracking-tight">
              E2E Encryption Workspace
            </h2>
            <p className="text-white/50 text-sm mt-3 max-w-md mx-auto leading-relaxed">
              Verify your Web3 wallet credentials to initialize gasless, secure, end-to-end encrypted direct messaging protocol via XMTP network layers.
            </p>
            <button
              onClick={() => login()}
              className="mt-8 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#00ff9d] text-black font-extrabold text-sm shadow-[0_0_25px_rgba(0,255,157,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Wallet className="h-4 w-4" /> Connect Wallet
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
          <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-8 text-center max-w-md shadow-2xl">
            <div className="h-14 w-14 rounded-2xl bg-white/[0.02] border border-white/10 grid place-content-center mx-auto mb-5">
              <MessageSquare className="h-7 w-7 text-[#00ff9d]" />
            </div>
            <h2 className="font-display text-2xl font-black text-white mb-2">
              {myRole === "investor" ? "No Active DMs" : "Waiting for matching nodes"}
            </h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              {myRole === "investor"
                ? "Swipe right on a startup to express interest. The builder will see it and can accept to initiate an E2E chat."
                : "Once an allocator swipes right on your listed ideas, they'll appear here for you to accept or decline."}
            </p>
            <Link
              to={myRole === "investor" ? "/feed" : "/dashboard/new-idea"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00ff9d] text-black font-extrabold hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer shadow-[0_0_15px_rgba(0,255,157,0.35)]"
            >
              {myRole === "investor" ? "Start Discover Feed" : "List New Idea"}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!current) return null;

  return (
    <AppShell>
      <div className="md:px-4 md:pt-4 max-w-6xl mx-auto" data-testid="chat-page">
        <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-120px)]">
          
          {/* Sidebar / Match queue */}
          <div className={`border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl md:rounded-3xl overflow-hidden shadow-xl flex flex-col ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}>
            <div className="p-5 border-b border-white/5">
              <div className="text-[9px] text-[#00ff9d] uppercase tracking-widest font-black flex items-center gap-1.5 mb-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff9d]" />
                </span>
                Active Sessions
              </div>
              <div className="font-display text-lg font-black text-white">Inbox</div>
            </div>
            
            <div className="overflow-y-auto flex-1 scrollbar-hide p-1">
              {matches.map((m) => {
                const counterW =
                  walletAddress && m.builderWallet.toLowerCase() === walletAddress.toLowerCase()
                    ? m.investorWallet
                    : m.builderWallet;
                const ck = counterW?.toLowerCase() || "";
                const nm = counterpartyProfiles[ck]?.name || shortAddress(counterW);
                const ini = counterpartyProfiles[ck]?.initials || counterW?.slice(2, 4)?.toUpperCase() || "??";
                const isSelected = active === m.id;
                
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActive(m.id);
                      setMobileShowChat(true);
                    }}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-2xl text-left transition-all mb-1 cursor-pointer ${
                      isSelected 
                        ? "bg-[#00ff9d]/8 border border-[#00ff9d]/20 text-[#00ff9d]" 
                        : "hover:bg-white/[0.03] text-white/70 border border-transparent"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00ff9d]/30 to-emerald-950 border border-[#00ff9d]/20 grid place-content-center text-xs font-black shrink-0 text-[#00ff9d]">
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm truncate text-white/90">{nm}</div>
                        {m.unread && (
                          <span className="h-2.5 w-2.5 rounded-full bg-[#00ff9d] shrink-0 shadow-[0_0_8px_rgba(0,255,157,0.8)]" />
                        )}
                      </div>
                      <div className="text-[10px] text-[#00ff9d] font-bold flex items-center gap-1.5 mt-0.5 truncate">
                        {m.ideaName}
                        {m.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[8px] font-black tracking-wide border border-amber-500/20">
                            PENDING
                          </span>
                        )}
                        {m.dealStatus === "confirmed" && (
                          <span className="px-2 py-0.5 rounded-full bg-[#00ff9d]/10 text-[#00ff9d] text-[8px] font-black tracking-wide border border-[#00ff9d]/25">
                            NFT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 truncate mt-1">
                        {m.lastMessage || "New interest session unlocked"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* E2E Cryptographic Conversation console */}
          <div className={`border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl md:rounded-3xl flex flex-col overflow-hidden shadow-2xl ${
            mobileShowChat ? "flex" : "hidden md:flex"
          }`}>
            {/* Upper console header */}
            <div className="p-4 pl-4 pr-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                {/* Back Button for mobile */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-2 -ml-2 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Back to inbox"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => counterpartyWallet && setProfileWallet(counterpartyWallet)}
                  className="flex items-center gap-3 hover:opacity-85 transition-opacity text-left group cursor-pointer"
                >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00ff9d]/30 to-emerald-950 border border-[#00ff9d]/20 grid place-content-center text-xs font-black text-[#00ff9d]">
                  {counterpartyInitials}
                </div>
                <div>
                  <div className="font-bold text-sm text-white group-hover:text-[#00ff9d] transition-colors">{counterpartyName}</div>
                  <div className="text-[10px] text-white/50 flex items-center gap-1 mt-0.5">
                    re: <span className="text-[#00ff9d] font-bold">{current.ideaName}</span>
                    {currentIdea && (
                      <span className="text-white/30 font-medium">• {currentIdea.industry}</span>
                    )}
                  </div>
                </div>
              </button>
            </div>

              <div className="flex items-center gap-3">
                {/* Protocol Security Tag */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    xmtpReady
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  {xmtpReady ? "E2E Secure" : "Initializing…"}
                </div>

                {/* Deal NFT triggers */}
                {iAmBuilder && isAccepted && current.dealStatus !== "confirmed" && (
                  <button
                    onClick={handleRequestDealNFT}
                    disabled={
                      pendingMetadata || isRequestingDeal || isConfirmingRequest || current.dealStatus === "requested"
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.02] hover:bg-[#00ff9d] border border-white/10 hover:border-transparent text-white hover:text-black font-extrabold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {pendingMetadata || isRequestingDeal || isConfirmingRequest ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {pendingMetadata ? "Pinning Metadata…" : isRequestingDeal ? "Connecting Wallet…" : "Broadcasting Transaction…"}
                      </>
                    ) : current.dealStatus === "requested" ? (
                      <>
                        <Hourglass className="h-3.5 w-3.5" /> Awaiting Investor Confirmation
                      </>
                    ) : (
                      <>
                        <Award className="h-3.5 w-3.5" /> Request Deal SBT
                      </>
                    )}
                  </button>
                )}

                {/* Allocator confirms and mints deal */}
                {iAmInvestor && current.dealStatus === "requested" && (
                  <button
                    onClick={handleConfirmDeal}
                    disabled={isConfirmPending || isConfirmMining || !current.dealId}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00ff9d] text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,255,157,0.35)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isConfirmPending || isConfirmMining ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                        {isConfirmPending ? "Processing wallet receipt…" : "Minting Proof Certificate…"}
                      </>
                    ) : !current.dealId ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-black" /> Syncing metadata…
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Confirm Deal & Mint NFT
                      </>
                    )}
                  </button>
                )}

                {current.dealStatus === "confirmed" && (
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00ff9d]/10 text-[#00ff9d] text-xs border border-[#00ff9d]/20 font-extrabold shadow-[0_0_10px_rgba(0,255,157,0.05)] select-none">
                    <Check className="h-3.5 w-3.5 text-[#00ff9d]" /> Deal NFT Minted
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Flow Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#080a09]/20 scrollbar-hide">
              {/* Profile accept gating panels */}
              {iAmBuilder && isPending && (
                <div className="border border-white/[0.08] bg-[#090b0a]/90 backdrop-blur-md rounded-2xl p-6 shadow-2xl text-center space-y-4 max-w-lg mx-auto">
                  <div className="h-12 w-12 rounded-xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mx-auto">
                    <Sparkles className="h-5 w-5 text-[#00ff9d]" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-white text-lg">Inbound match connection!</h3>
                    <p className="text-white/50 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
                      {counterpartyName} wants to fund "{current.ideaName}". Accept to immediately negotiate via decentralized E2E chat.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      onClick={handleAccept}
                      className="px-6 py-2.5 rounded-xl bg-[#00ff9d] text-black font-extrabold text-xs flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,255,157,0.3)]"
                    >
                      <Check className="h-4 w-4" /> Accept Connection
                    </button>
                    <button
                      onClick={handleDecline}
                      className="px-6 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <X className="h-4 w-4" /> Decline
                    </button>
                  </div>
                </div>
              )}

              {iAmInvestor && isPending && (
                <div className="border border-white/[0.08] bg-[#090b0a]/90 backdrop-blur-md rounded-2xl p-6 shadow-2xl text-center space-y-4 max-w-lg mx-auto">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-content-center mx-auto">
                    <Hourglass className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-white text-lg">Awaiting profile registration</h3>
                    <p className="text-white/50 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
                      You swiped right. Once {current.builderName} confirms interest, secure chat workspace credentials will be created immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* Encryption pending loader */}
              {!xmtpReady && isAccepted && (
                <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 text-center space-y-2 max-w-md mx-auto shadow-sm">
                  {xmtpInitializing ? (
                    <>
                      <Loader2 className="h-5 w-5 text-amber-400 mx-auto animate-spin" />
                      <p className="text-xs text-amber-300 font-bold">Verifying cryptographic keys on XMTP network…</p>
                    </>
                  ) : xmtpError ? (
                    <>
                      <p className="text-xs text-rose-400 font-bold">{xmtpError}</p>
                      <button
                        onClick={initializeXMTP}
                        className="text-xs text-[#00ff9d] font-bold hover:underline cursor-pointer"
                      >
                        Retry Signature Verification
                      </button>
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 text-amber-400 mx-auto animate-pulse" />
                      <p className="text-xs text-amber-300 font-bold">Initializing E2E Encryption Protocol layers…</p>
                    </>
                  )}
                </div>
              )}

              {/* Messages Loader */}
              {messagesLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Loader2 className="h-4 w-4 animate-spin text-[#00ff9d]" />
                    <span className="font-bold">Syncing message database…</span>
                  </div>
                </div>
              )}

              {/* Message loop bubbles */}
              {!messagesLoading && messages
                .filter((msg) => {
                  if (!msg.content || msg.content.trim().length === 0) return false;
                  if (msg.content.startsWith('{"') || msg.content.startsWith('[{')) return false;
                  return true;
                })
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"} mb-1.5`}
                  >
                    <div
                      className={`relative max-w-[70%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.isFromMe
                          ? "bg-[#00ff9d]/8 text-[#e2fff2] rounded-2xl rounded-tr-none border border-[#00ff9d]/15"
                          : "bg-white/[0.03] text-white/90 rounded-2xl rounded-tl-none border border-white/10"
                      }`}
                      style={{
                        boxShadow: msg.isFromMe
                          ? '0 2px 8px rgba(0,255,157,0.03)'
                          : '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      {msg.content}
                      <div className={`flex items-center gap-1.5 mt-1 ${
                        msg.isFromMe ? "justify-end" : "justify-start"
                      }`}>
                        <span className={`text-[9px] ${
                          msg.isFromMe ? "text-[#00ff9d]/40" : "text-white/30"
                        } font-bold`}>
                          {msg.sent.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.isFromMe && (
                          <span className="text-[10px] text-[#00ff9d]/40">
                            {msg.id.startsWith('optimistic-') ? '○' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {/* Request Deal NFT Cards */}
              {current.dealStatus === "requested" && (
                <div className="flex justify-center my-6">
                  <div className="max-w-md w-full border border-[#00ff9d]/20 bg-[#00ff9d]/5 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_20px_rgba(0,255,157,0.05)]">
                    <div className="h-12 w-12 rounded-xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mx-auto">
                      <Award className="h-6 w-6 text-[#00ff9d]" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-white text-base">On-Chain Proof of Funding Requested</h3>
                      <p className="text-white/50 text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">
                        {iAmBuilder
                          ? "Waiting for the investor to authorize the token contract and mint the Soulbound Deal Badge…"
                          : "Builder requested deal milestone validation. Sign with wallet to mint the immutably certified SBT."}
                      </p>
                    </div>
                    {iAmInvestor && (
                      <button
                        onClick={handleConfirmDeal}
                        disabled={isConfirmPending || isConfirmMining || !current.dealId}
                        className="px-6 py-2.5 rounded-xl bg-[#00ff9d] text-black font-extrabold text-xs flex items-center gap-2 mx-auto hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(0,255,157,0.3)]"
                      >
                        {isConfirmPending || isConfirmMining ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-black" />
                            {isConfirmPending ? "Syncing contract keys…" : "Minting SBT Badge on Mantle…"}
                          </>
                        ) : !current.dealId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-black" /> Processing receipts…
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" /> Confirm & Mint Deal Badge
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {current.dealStatus === "confirmed" && (
                <div className="flex justify-center my-6">
                  <div className="max-w-md w-full border border-[#00ff9d]/20 bg-[#00ff9d]/5 rounded-2xl p-6 text-center space-y-3 shadow-[0_0_20px_rgba(0,255,157,0.05)] animate-pulse">
                    <div className="h-12 w-12 rounded-xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mx-auto">
                      <Award className="h-6 w-6 text-[#00ff9d]" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-[#00ff9d] text-lg">SBT Deal Certified! 🎉</h3>
                      <p className="text-white/60 text-xs mt-1.5 leading-relaxed">
                        Proof-of-funding digital certificate has been minted on-chain. Visual badge details are now public on founder and investor showcase profiles!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Error alert boxes */}
              {(dealError || confirmError) && (
                <div className="border border-rose-500/20 bg-rose-500/10 rounded-2xl p-4 text-xs text-rose-400 font-bold max-w-md mx-auto my-3 text-center">
                  {(dealError || confirmError)?.message}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input pill control dock */}
            {isAccepted && (
              <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-1.5 mb-2.5 px-2">
                  <Lock className="h-3 w-3 text-[#00ff9d]" />
                  <span className="text-[10px] text-white/40 font-bold tracking-wide uppercase">
                    {xmtpReady ? "Decentralized E2E encryption enabled // XMTP MLS" : "Awaiting cryptographic setup"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Type a secure message…"
                    disabled={!xmtpReady}
                    className="flex-1 bg-white/[0.03] focus:bg-white/[0.06] rounded-2xl px-5 py-3 text-sm outline-none border border-white/10 focus:border-[#00ff9d]/30 text-white transition-all disabled:opacity-50 placeholder-white/20 font-semibold"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || !xmtpReady || sending}
                    aria-label="Send message"
                    className="h-11 w-11 rounded-xl bg-[#00ff9d] text-black grid place-content-center shadow-[0_0_15px_rgba(0,255,157,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin text-black" />
                    ) : (
                      <Send className="h-4.5 w-4.5 text-black" />
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
