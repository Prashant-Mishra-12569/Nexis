import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/nexis/AppShell";
import {
  declineMatch,
  getIdeas,
  getMatches,
  markMatchRead,
  updateMatchLastMessage,
  type Idea,
  type Match,
} from "@/lib/nexis/ideasStore";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRequestDealConfirmation } from "@/lib/web3/hooks";
import { createDealNFTMetadata } from "@/lib/web3/pinata";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

type Msg = { from: "me" | "them"; text: string; timestamp: string };

const MESSAGES_KEY = "nexis_messages";
const ACCEPTED_KEY = "nexis_accepted_matches";

function getStoredMessages(): Record<string, Msg[]> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(MESSAGES_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveMessages(messages: Record<string, Msg[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

function getAcceptedMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(ACCEPTED_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAcceptedMap(map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCEPTED_KEY, JSON.stringify(map));
}

function ChatPage() {
  const { isAuthenticated, walletAddress, login } = useAuth();
  const {
    requestDeal,
    isPending: isRequestingDeal,
    isConfirming: isConfirmingDeal,
    isSuccess: dealRequested,
    error: dealError,
  } = useRequestDealConfirmation();

  const [matches, setMatches] = useState<Match[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [isXMTPReady, setIsXMTPReady] = useState(false);
  const [pendingMetadata, setPendingMetadata] = useState(false);
  const [msgs, setMsgs] = useState<Record<string, Msg[]>>({});
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const refresh = () => {
    setMatches(getMatches());
    setIdeas(getIdeas());
    setMsgs(getStoredMessages());
    setAccepted(getAcceptedMap());
  };

  useEffect(refresh, []);

  // Auto-select first match
  useEffect(() => {
    if (!active && matches.length > 0) {
      setActive(matches[0].id);
    }
  }, [matches, active]);

  // Mark current match read on open
  useEffect(() => {
    if (!active) return;
    const m = matches.find((x) => x.id === active);
    if (!m || !m.unread) return;
    markMatchRead(active);
    setMatches((prev) => prev.map((x) => (x.id === active ? { ...x, unread: false } : x)));
  }, [active, matches]);

  // Simulated XMTP readiness (real init would call initXMTP with the signer)
  useEffect(() => {
    if (isAuthenticated && walletAddress) {
      setIsXMTPReady(false);
      const timer = setTimeout(() => setIsXMTPReady(true), 600);
      return () => clearTimeout(timer);
    }
    setIsXMTPReady(false);
  }, [isAuthenticated, walletAddress]);

  const current = useMemo(() => matches.find((m) => m.id === active) ?? null, [matches, active]);
  const currentIdea = useMemo(
    () => (current ? (ideas.find((i) => i.id === current.ideaId) ?? null) : null),
    [current, ideas],
  );
  const isAccepted = active ? (accepted[active] ?? false) : false;
  const currentMsgs = active ? (msgs[active] ?? []) : [];

  function accept(matchId: string) {
    const updated = { ...accepted, [matchId]: true };
    setAccepted(updated);
    saveAcceptedMap(updated);
  }

  function decline(matchId: string) {
    declineMatch(matchId);
    const updated = { ...accepted };
    delete updated[matchId];
    saveAcceptedMap(updated);
    setAccepted(updated);
    const remainingMatches = getMatches();
    setMatches(remainingMatches);
    setActive(remainingMatches[0]?.id ?? null);
  }

  function send() {
    if (!input.trim() || !active) return;
    const newMsg: Msg = { from: "me", text: input, timestamp: new Date().toISOString() };
    const updatedMsgs = { ...msgs, [active]: [...(msgs[active] ?? []), newMsg] };
    setMsgs(updatedMsgs);
    saveMessages(updatedMsgs);
    updateMatchLastMessage(active, input);
    setMatches((prev) => prev.map((m) => (m.id === active ? { ...m, lastMessage: input } : m)));
    setInput("");
  }

  async function handleRequestDealNFT() {
    if (!walletAddress || !current) return;
    setPendingMetadata(true);
    try {
      const investorAddress =
        current.walletAddress &&
        current.walletAddress.startsWith("0x") &&
        current.walletAddress.length >= 42
          ? current.walletAddress
          : "0x000000000000000000000000000000000000dEaD";
      const metadataResult = await createDealNFTMetadata({
        startupName: current.ideaName,
        builderAddress: walletAddress,
        investorAddress,
        date: new Date().toISOString().split("T")[0],
        industry: currentIdea?.industry || "Other",
      });

      if (metadataResult.success && metadataResult.ipfsUrl) {
        requestDeal(investorAddress, current.ideaName, metadataResult.ipfsUrl);
      }
    } catch (error) {
      console.error("Failed to request deal NFT:", error);
    } finally {
      setPendingMetadata(false);
    }
  }

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
              All conversations live in your wallet. Sign in to start chatting.
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
            <h2 className="font-display text-2xl font-bold mb-2">No matches yet</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Start swiping to connect with founders and investors. Your matches will appear here.
            </p>
            <Link
              to="/feed"
              data-testid="chat-go-feed-btn"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
            >
              Start Swiping
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
              <div className="text-xs text-[var(--neon)] uppercase tracking-widest">Matches</div>
              <div className="font-display text-lg font-bold">Inbox</div>
            </div>
            <div
              className="overflow-y-auto max-h-[calc(100vh-280px)]"
              data-testid="chat-match-list"
            >
              {matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActive(m.id)}
                  data-testid={`match-item-${m.id}`}
                  className={`w-full flex items-start gap-3 p-4 border-b border-white/5 text-left transition-colors ${
                    active === m.id ? "bg-[var(--neon)]/5" : "hover:bg-white/5"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--neon)]/40 to-emerald-900 grid place-content-center text-xs font-bold shrink-0">
                    {m.founderAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{m.founderName}</div>
                      {m.unread && (
                        <span className="h-2 w-2 rounded-full bg-[var(--neon)] shrink-0 shadow-[0_0_8px_rgba(0,255,157,0.8)]" />
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--neon)]">{m.ideaName}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {m.lastMessage || "New match!"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation */}
          <div className="glass md:rounded-2xl flex flex-col overflow-hidden border-y md:border border-white/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--neon)]/40 to-emerald-900 grid place-content-center text-xs font-bold">
                  {current.founderAvatar}
                </div>
                <div>
                  <div className="font-medium text-sm" data-testid="chat-active-founder">
                    {current.founderName}
                  </div>
                  <div className="text-[11px] text-[var(--neon)]">
                    re: {current.ideaName}
                    {currentIdea && (
                      <span className="text-muted-foreground ml-2">• {currentIdea.industry}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleRequestDealNFT}
                disabled={pendingMetadata || isRequestingDeal || isConfirmingDeal || dealRequested}
                data-testid="chat-deal-nft-btn"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full neon-border text-[var(--neon)] text-xs hover:bg-[var(--neon)] hover:text-black transition-all disabled:opacity-50"
              >
                {pendingMetadata || isRequestingDeal || isConfirmingDeal ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                    {pendingMetadata ? "Pinning…" : isRequestingDeal ? "Confirm…" : "Mining…"}
                  </>
                ) : dealRequested ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Requested!
                  </>
                ) : (
                  <>
                    <Award className="h-3.5 w-3.5" /> Request Deal NFT
                  </>
                )}
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
              data-testid="chat-messages-area"
            >
              {!isAccepted && active && (
                <div
                  className="glass-strong rounded-2xl p-5 neon-border text-center space-y-3"
                  data-testid="chat-accept-prompt"
                >
                  <Sparkles className="h-6 w-6 text-[var(--neon)] mx-auto" />
                  <div className="font-display font-bold">
                    {current.founderName} wants to connect.
                  </div>
                  <div className="text-xs text-muted-foreground">
                    They're interested in {current.ideaName}. Accept to start chatting.
                  </div>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={() => accept(active)}
                      data-testid="chat-accept-btn"
                      className="px-5 py-2 rounded-full bg-[var(--neon)] text-black font-semibold text-sm flex items-center gap-1.5 hover:scale-105 transition-all"
                    >
                      <Check className="h-4 w-4" /> Accept
                    </button>
                    <button
                      onClick={() => decline(active)}
                      data-testid="chat-decline-btn"
                      className="px-5 py-2 rounded-full border border-rose-500/40 text-rose-400 text-sm flex items-center gap-1.5 hover:bg-rose-500/10 transition-all"
                    >
                      <X className="h-4 w-4" /> Decline
                    </button>
                  </div>
                </div>
              )}

              {currentMsgs.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.from === "me"
                        ? "bg-white/5 text-white border border-white/10"
                        : "neon-border text-[var(--neon)] bg-[var(--neon)]/5"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {dealError && (
                <div
                  className="glass rounded-xl p-3 text-xs text-rose-400 border border-rose-500/30"
                  data-testid="chat-deal-error"
                >
                  {dealError.message}
                </div>
              )}
            </div>

            {isAccepted && (
              <div className="p-3 md:p-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-3 w-3 text-[var(--neon)]" />
                  <span className="text-[10px] text-muted-foreground">
                    {isXMTPReady ? "End-to-end encrypted via XMTP" : "Connecting to XMTP..."}
                  </span>
                  {!isXMTPReady && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Type a message…"
                    disabled={!isXMTPReady}
                    data-testid="chat-message-input"
                    className="flex-1 bg-white/5 rounded-full px-5 py-3 text-sm outline-none border border-white/5 focus:border-[var(--neon)]/40 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={send}
                    disabled={!isXMTPReady || !input.trim()}
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
    </AppShell>
  );
}
