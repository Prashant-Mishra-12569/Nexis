import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/nexis/AppShell";
import { PublicProfileModal } from "@/components/nexis/PublicProfileModal";
import {
  acceptMatch,
  appendMessage,
  declineMatch,
  getIdeas,
  getMatchesForWallet,
  getMessages,
  markMatchRead,
  patchMessage,
  updateMatch,
  type Idea,
  type Match,
  type Message,
} from "@/lib/nexis/ideasStore";
import { getProfile, type UserProfile } from "@/lib/nexis/profileStore";
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRequestDealConfirmation, useConfirmDeal } from "@/lib/web3/hooks";
import { createDealNFTMetadata } from "@/lib/web3/pinata";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { isAuthenticated, walletAddress, login } = useAuth();
  const myProfile = walletAddress ? getProfile(walletAddress) : null;
  const myRole: "builder" | "investor" | null = myProfile?.role ?? null;

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

  const [matches, setMatches] = useState<Match[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [input, setInput] = useState("");
  const [pendingMetadata, setPendingMetadata] = useState(false);
  const [profileWallet, setProfileWallet] = useState<string | null>(null);
  // The matchId we just requested a deal NFT for — we need it so we can stamp the
  // dealId on the message once the tx receipt arrives.
  const [pendingDealRequestForMatchId, setPendingDealRequestForMatchId] = useState<string | null>(
    null,
  );
  const [pendingDealMessageId, setPendingDealMessageId] = useState<string | null>(null);

  const refresh = () => {
    setMatches(getMatchesForWallet(walletAddress, myRole ?? undefined));
    setIdeas(getIdeas());
  };

  useEffect(refresh, [walletAddress, myRole]);

  // Auto-select first match
  useEffect(() => {
    if (!active && matches.length > 0) {
      setActive(matches[0].id);
    }
  }, [matches, active]);

  // Load messages for the active match
  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }
    setMessages(getMessages(active));
  }, [active]);

  // Mark current match read on open
  useEffect(() => {
    if (!active) return;
    const m = matches.find((x) => x.id === active);
    if (!m || !m.unread) return;
    markMatchRead(active);
    setMatches((prev) => prev.map((x) => (x.id === active ? { ...x, unread: false } : x)));
  }, [active, matches]);

  // After deal request tx mines, stamp the dealId onto the message and the match
  useEffect(() => {
    if (!dealRequested || !requestedDealId) return;
    if (!pendingDealRequestForMatchId || !pendingDealMessageId) return;

    patchMessage(pendingDealRequestForMatchId, pendingDealMessageId, { dealId: requestedDealId });
    updateMatch(pendingDealRequestForMatchId, {
      dealStatus: "requested",
      dealId: requestedDealId,
    });
    setMessages(getMessages(pendingDealRequestForMatchId));
    setMatches(getMatchesForWallet(walletAddress, myRole ?? undefined));
    setPendingDealRequestForMatchId(null);
    setPendingDealMessageId(null);
  }, [
    dealRequested,
    requestedDealId,
    pendingDealRequestForMatchId,
    pendingDealMessageId,
    walletAddress,
    myRole,
  ]);

  // After investor confirms deal on-chain, mark match dealStatus = confirmed
  useEffect(() => {
    if (!dealConfirmed || !active) return;
    updateMatch(active, { dealStatus: "confirmed" });
    setMatches(getMatchesForWallet(walletAddress, myRole ?? undefined));
  }, [dealConfirmed, active, walletAddress, myRole]);

  const current = useMemo(() => matches.find((m) => m.id === active) ?? null, [matches, active]);
  const currentIdea = useMemo(
    () => (current ? (ideas.find((i) => i.id === current.ideaId) ?? null) : null),
    [current, ideas],
  );
  const iAmBuilder =
    !!current &&
    walletAddress &&
    current.builderWallet?.toLowerCase() === walletAddress.toLowerCase();
  const iAmInvestor =
    !!current &&
    walletAddress &&
    current.investorWallet?.toLowerCase() === walletAddress.toLowerCase();
  const counterpartyWallet = iAmBuilder ? current?.investorWallet : current?.builderWallet;
  const counterpartyProfile = counterpartyWallet ? getProfile(counterpartyWallet) : null;
  const counterpartyName =
    counterpartyProfile?.name ||
    (iAmBuilder ? `Investor ${current?.investorWallet?.slice(0, 6)}…` : current?.builderName) ||
    "Counterparty";
  const counterpartyInitials = (
    counterpartyProfile?.name?.slice(0, 2) ||
    counterpartyWallet?.slice(2, 4) ||
    "??"
  ).toUpperCase();

  const isAccepted = current?.status === "accepted";
  const isPending = current?.status === "pending";

  function send() {
    if (!input.trim() || !active || !walletAddress) return;
    appendMessage({
      matchId: active,
      senderWallet: walletAddress,
      text: input,
      type: "text",
    });
    setMessages(getMessages(active));
    setMatches((prev) => prev.map((m) => (m.id === active ? { ...m, lastMessage: input } : m)));
    setInput("");
  }

  function handleAccept() {
    if (!active) return;
    acceptMatch(active);
    if (walletAddress) {
      appendMessage({
        matchId: active,
        senderWallet: walletAddress,
        text: `${myProfile?.name || "Builder"} accepted the interest. Let's chat!`,
        type: "text",
      });
    }
    setMatches(getMatchesForWallet(walletAddress, myRole ?? undefined));
    setMessages(getMessages(active));
  }

  function handleDecline() {
    if (!active) return;
    declineMatch(active);
    const remaining = getMatchesForWallet(walletAddress, myRole ?? undefined).filter(
      (m) => m.status !== "declined",
    );
    setMatches(remaining);
    setActive(remaining[0]?.id ?? null);
  }

  async function handleRequestDealNFT() {
    if (!walletAddress || !current || !iAmBuilder) return;
    setPendingMetadata(true);
    try {
      const investorAddress =
        current.investorWallet &&
        current.investorWallet.startsWith("0x") &&
        current.investorWallet.length >= 42
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
        console.error("Pinata metadata upload failed", metadataResult.error);
        setPendingMetadata(false);
        return;
      }

      // Append the deal request message immediately so investor sees it
      const msg = appendMessage({
        matchId: current.id,
        senderWallet: walletAddress,
        text: `${myProfile?.name || "Builder"} has requested a Deal NFT confirmation. Please confirm on-chain to mint the soulbound badge to the builder.`,
        type: "deal_request",
        tokenURI: metadataResult.ipfsUrl,
      });
      setPendingDealRequestForMatchId(current.id);
      setPendingDealMessageId(msg.id);
      setMessages(getMessages(current.id));

      requestDeal(investorAddress, current.ideaName, metadataResult.ipfsUrl);
    } catch (error) {
      console.error("Failed to request deal NFT:", error);
    } finally {
      setPendingMetadata(false);
    }
  }

  function handleConfirmDeal(msg: Message) {
    if (!msg.dealId) {
      console.warn("Cannot confirm: dealId missing (tx receipt not yet processed)");
      return;
    }
    confirmDeal(msg.dealId);
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
              Conversations are end-to-end secured via your wallet signature.
            </p>
            <button
              onClick={() => login()}
              data-testid="chat-connect-btn"
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
        <div
          className="flex flex-col items-center justify-center min-h-[60vh] px-4"
          data-testid="chat-empty"
        >
          <div className="glass-strong rounded-3xl p-8 text-center max-w-md neon-border">
            <MessageSquare className="h-12 w-12 text-[var(--neon)] mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">
              {myRole === "investor" ? "No interests yet" : "No incoming interest"}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {myRole === "investor"
                ? "Swipe right on a startup to express interest. The builder will see it and accept or decline."
                : "Once an investor swipes right on one of your ideas, they'll appear here for you to accept or decline."}
            </p>
            <Link
              to={myRole === "investor" ? "/feed" : "/dashboard/new-idea"}
              data-testid="chat-go-feed-btn"
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
          {/* Matches list */}
          <div className="glass md:rounded-2xl overflow-hidden border-y md:border border-white/5">
            <div className="p-4 border-b border-white/5">
              <div className="text-xs text-[var(--neon)] uppercase tracking-widest">
                {myRole === "investor" ? "Your interests" : "Inbound interest"}
              </div>
              <div className="font-display text-lg font-bold">Inbox</div>
            </div>
            <div
              className="overflow-y-auto max-h-[calc(100vh-280px)]"
              data-testid="chat-match-list"
            >
              {matches.map((m) => {
                const counterpartyW =
                  walletAddress && m.builderWallet.toLowerCase() === walletAddress.toLowerCase()
                    ? m.investorWallet
                    : m.builderWallet;
                const cprof = getProfile(counterpartyW);
                const nm =
                  cprof?.name ||
                  (walletAddress && m.builderWallet.toLowerCase() === walletAddress.toLowerCase()
                    ? `Investor ${m.investorWallet.slice(0, 6)}…`
                    : m.builderName);
                return (
                  <button
                    key={m.id}
                    onClick={() => setActive(m.id)}
                    data-testid={`match-item-${m.id}`}
                    className={`w-full flex items-start gap-3 p-4 border-b border-white/5 text-left transition-colors ${
                      active === m.id ? "bg-[var(--neon)]/5" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--neon)]/40 to-emerald-900 grid place-content-center text-xs font-bold shrink-0">
                      {(
                        cprof?.name?.slice(0, 2) ||
                        counterpartyW.slice(2, 4) ||
                        "??"
                      ).toUpperCase()}
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

          {/* Conversation */}
          <div className="glass md:rounded-2xl flex flex-col overflow-hidden border-y md:border border-white/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <button
                onClick={() => counterpartyWallet && setProfileWallet(counterpartyWallet)}
                data-testid="chat-active-header"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--neon)]/40 to-emerald-900 grid place-content-center text-xs font-bold">
                  {counterpartyInitials}
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm" data-testid="chat-active-counterparty">
                    {counterpartyName}
                  </div>
                  <div className="text-[11px] text-[var(--neon)]">
                    re: {current.ideaName}
                    {currentIdea && (
                      <span className="text-muted-foreground ml-2">• {currentIdea.industry}</span>
                    )}
                  </div>
                </div>
              </button>
              {/* Request Deal NFT — builders only, after accept */}
              {iAmBuilder && isAccepted && current.dealStatus !== "confirmed" && (
                <button
                  onClick={handleRequestDealNFT}
                  disabled={
                    pendingMetadata ||
                    isRequestingDeal ||
                    isConfirmingRequest ||
                    current.dealStatus === "requested"
                  }
                  data-testid="chat-deal-nft-btn"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full neon-border text-[var(--neon)] text-xs hover:bg-[var(--neon)] hover:text-black transition-all disabled:opacity-50"
                >
                  {pendingMetadata || isRequestingDeal || isConfirmingRequest ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
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
              {current.dealStatus === "confirmed" && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--neon)]/10 text-[var(--neon)] text-xs neon-border">
                  <Check className="h-3.5 w-3.5" /> Deal NFT minted
                </div>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
              data-testid="chat-messages-area"
            >
              {/* Builder Accept/Decline prompt */}
              {iAmBuilder && isPending && (
                <div
                  className="glass-strong rounded-2xl p-5 neon-border text-center space-y-3"
                  data-testid="chat-accept-prompt"
                >
                  <Sparkles className="h-6 w-6 text-[var(--neon)] mx-auto" />
                  <div className="font-display font-bold">
                    {counterpartyName} swiped right on {current.ideaName}.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Accept to open the chat and explore the deal. Decline to remove this interest
                    from your inbox.
                  </div>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={handleAccept}
                      data-testid="chat-accept-btn"
                      className="px-5 py-2 rounded-full bg-[var(--neon)] text-black font-semibold text-sm flex items-center gap-1.5 hover:scale-105 transition-all"
                    >
                      <Check className="h-4 w-4" /> Accept
                    </button>
                    <button
                      onClick={handleDecline}
                      data-testid="chat-decline-btn"
                      className="px-5 py-2 rounded-full border border-rose-500/40 text-rose-400 text-sm flex items-center gap-1.5 hover:bg-rose-500/10 transition-all"
                    >
                      <X className="h-4 w-4" /> Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Investor waiting state */}
              {iAmInvestor && isPending && (
                <div
                  className="glass-strong rounded-2xl p-5 neon-border text-center space-y-3"
                  data-testid="chat-waiting-prompt"
                >
                  <Hourglass className="h-6 w-6 text-amber-400 mx-auto" />
                  <div className="font-display font-bold">
                    Waiting for the builder to accept your interest.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {current.builderName} will be notified. Once they accept, you can start
                    chatting.
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isMine =
                  walletAddress && msg.senderWallet.toLowerCase() === walletAddress.toLowerCase();

                if (msg.type === "deal_request") {
                  // System-style card. Investor sees a Confirm button (if they're the investor).
                  const canConfirm = iAmInvestor && current.dealStatus === "requested";
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center"
                      data-testid={`deal-request-${msg.id}`}
                    >
                      <div className="max-w-md w-full glass-strong rounded-2xl p-5 neon-border space-y-3 text-center">
                        <Award className="h-6 w-6 text-[var(--neon)] mx-auto" />
                        <div className="font-display font-bold text-sm">Deal NFT requested</div>
                        <div className="text-xs text-muted-foreground">{msg.text}</div>
                        {canConfirm ? (
                          <button
                            onClick={() => handleConfirmDeal(msg)}
                            disabled={isConfirmPending || isConfirmMining || !msg.dealId}
                            data-testid="chat-confirm-deal-btn"
                            className="px-5 py-2 rounded-full bg-[var(--neon)] text-black text-sm font-semibold flex items-center gap-2 mx-auto hover:scale-105 transition-all disabled:opacity-50"
                          >
                            {isConfirmPending || isConfirmMining ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                                {isConfirmPending ? "Confirm in wallet…" : "Minting…"}
                              </>
                            ) : !msg.dealId ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for
                                on-chain receipt…
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" /> Confirm & Mint NFT
                              </>
                            )}
                          </button>
                        ) : current.dealStatus === "confirmed" ? (
                          <div className="text-xs text-[var(--neon)]">
                            Deal NFT minted to the builder ✓
                          </div>
                        ) : iAmBuilder ? (
                          <div className="text-xs text-amber-300">
                            Awaiting investor confirmation…
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMine
                          ? "bg-[var(--neon)]/10 text-[var(--neon)] neon-border"
                          : "bg-white/5 text-white border border-white/10"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {(dealError || confirmError) && (
                <div
                  className="glass rounded-xl p-3 text-xs text-rose-400 border border-rose-500/30"
                  data-testid="chat-deal-error"
                >
                  {(dealError || confirmError)?.message}
                </div>
              )}
            </div>

            {isAccepted && (
              <div className="p-3 md:p-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-3 w-3 text-[var(--neon)]" />
                  <span className="text-[10px] text-muted-foreground">
                    Messages signed by your wallet
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Type a message…"
                    data-testid="chat-message-input"
                    className="flex-1 bg-white/5 rounded-full px-5 py-3 text-sm outline-none border border-white/5 focus:border-[var(--neon)]/40 transition-colors"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim()}
                    data-testid="chat-send-btn"
                    aria-label="Send message"
                    className="h-11 w-11 rounded-full bg-[var(--neon)] text-black grid place-content-center neon-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Send className="h-4 w-4" />
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
