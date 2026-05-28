import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { X, Check, Star, Sparkles, RefreshCw, Bookmark, Loader2 } from "lucide-react";
import { IdeaExpandView } from "./IdeaExpandView";
import { useAuth } from "@/hooks/useAuth";
import { useNexisData, type Idea } from "@/hooks/useNexisData";
import { PublicProfileModal } from "./PublicProfileModal";

function Card({
  idea,
  onSwipe,
  onTap,
  onFounderClick,
  isTop,
}: {
  idea: Idea;
  onSwipe: (dir: "left" | "right") => void;
  onTap: () => void;
  onFounderClick: (wallet: string) => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);

  function onEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 120) onSwipe("right");
    else if (info.offset.x < -120) onSwipe("left");
  }

  return (
    <motion.div
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onEnd}
      style={{ x, rotate }}
      className="absolute inset-0"
      initial={{ scale: isTop ? 1 : 0.94, y: isTop ? 0 : 20, opacity: isTop ? 1 : 0.6 }}
      animate={{ scale: isTop ? 1 : 0.94, y: isTop ? 0 : 20, opacity: isTop ? 1 : 0.6 }}
      exit={{ x: x.get() > 0 ? 600 : -600, opacity: 0, transition: { duration: 0.35 } }}
    >
      <div
        onClick={isTop ? onTap : undefined}
        data-testid={isTop ? `card-${idea.id}` : undefined}
        className="relative w-full h-full rounded-3xl overflow-hidden glass-strong neon-border shadow-2xl cursor-pointer"
      >
        <img
          src={idea.image}
          alt={idea.name}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-8 left-8 px-4 py-2 border-2 border-[var(--neon)] rounded-xl text-[var(--neon)] font-display font-bold text-2xl tracking-widest rotate-[-12deg]"
        >
          LIKE
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-8 right-8 px-4 py-2 border-2 border-rose-500 rounded-xl text-rose-500 font-display font-bold text-2xl tracking-widest rotate-[12deg]"
        >
          NOPE
        </motion.div>

        <div className="absolute top-5 inset-x-5 flex items-center justify-between">
          <span className="glass px-3 py-1.5 rounded-full text-xs font-medium">
            {idea.industry}
          </span>
          <span className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full text-xs font-medium text-[var(--neon)] neon-border">
            <Sparkles className="h-3 w-3" /> {idea.matchScore}% Match
          </span>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-6 space-y-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (idea.walletAddress) onFounderClick(idea.walletAddress);
            }}
            data-testid={`card-founder-${idea.id}`}
            className="text-[var(--neon)] text-sm font-medium hover:underline"
          >
            {idea.founder}
          </button>
          <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight">{idea.name}</h2>
          <p className="text-sm text-white/80 leading-relaxed">{idea.tagline}</p>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Asking</span>
            <span className="font-display font-bold text-xl">{idea.ask}</span>
            <span className="text-xs text-muted-foreground">• {idea.equity} equity</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface SwipeDeckProps {
  ideas?: Idea[];
  onChanged?: () => void;
}

export function SwipeDeck({ ideas: externalIdeas, onChanged }: SwipeDeckProps) {
  const controlled = externalIdeas !== undefined;
  const { walletAddress } = useAuth();
  const {
    getUnswipedIdeas,
    saveSwipe: saveSwipeTL,
    toggleSaved,
    isIdeaSaved,
    refreshIdeas,
    tablesReady,
  } = useNexisData();

  const [internalIdeas, setInternalIdeas] = useState<Idea[]>([]);
  const [index, setIndex] = useState(0);
  const [expandedIdea, setExpandedIdea] = useState<Idea | null>(null);
  const [profileWallet, setProfileWallet] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<"saved" | "unsaved" | null>(null);
  const [swiping, setSwiping] = useState(false);
  const viewedRef = useRef<Set<string>>(new Set());

  const ideas = controlled ? externalIdeas! : internalIdeas;

  // Uncontrolled fetch
  useEffect(() => {
    if (!controlled) {
      setInternalIdeas(getUnswipedIdeas());
    }
  }, [controlled, getUnswipedIdeas]);

  // Reset index when controlled list changes shape
  useEffect(() => {
    setIndex(0);
  }, [controlled, externalIdeas?.length]);

  const current = ideas[index];
  const next = ideas[index + 1];
  const hasIdeas = ideas.length > 0 && index < ideas.length;

  const currentSaved = current ? isIdeaSaved(current.id) : false;

  const swipe = useCallback(
    async (dir: "left" | "right") => {
      if (!current || swiping) return;
      setSwiping(true);
      try {
        await saveSwipeTL(current.id, dir === "right");
        setIndex((i) => i + 1);
        onChanged?.();
      } catch (e) {
        console.error("Swipe failed:", e);
      } finally {
        setSwiping(false);
      }
    },
    [current, swiping, saveSwipeTL, onChanged],
  );

  function handleTap() {
    if (current) setExpandedIdea(current);
  }

  async function handleSave() {
    if (!current) return;
    try {
      const nowSaved = await toggleSaved(current.id);
      setSavedFlash(nowSaved ? "saved" : "unsaved");
      onChanged?.();
      setTimeout(() => setSavedFlash(null), 1200);
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  async function handleReset() {
    viewedRef.current.clear();
    await refreshIdeas();
    if (!controlled) setInternalIdeas(getUnswipedIdeas());
    setIndex(0);
    onChanged?.();
  }

  if (!tablesReady) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 py-20">
        <div className="glass-strong rounded-3xl p-8 text-center neon-border">
          <Loader2 className="h-12 w-12 text-[var(--neon)] mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-2xl font-bold mb-2">Setting up…</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Tableland tables need to be created first.
          </p>
          <a
            href="/setup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
          >
            Go to Setup →
          </a>
        </div>
      </div>
    );
  }

  if (!hasIdeas) {
    return (
      <div
        className="w-full max-w-md mx-auto flex flex-col items-center gap-6 py-20"
        data-testid="feed-empty"
      >
        <div className="glass-strong rounded-3xl p-8 text-center neon-border">
          <Sparkles className="h-12 w-12 text-[var(--neon)] mx-auto mb-4" />
          <h3 className="font-display text-2xl font-bold mb-2">You've seen everything!</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {ideas.length === 0
              ? "No ideas in the feed yet. Builders need to list their startups first."
              : "Check back later for new startups or refresh the feed."}
          </p>
          <button
            onClick={handleReset}
            data-testid="feed-reset-btn"
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="w-full max-w-md mx-auto flex flex-col items-center gap-6"
        data-testid="feed-deck"
      >
        <div className="relative w-full" style={{ height: "min(70vh, 620px)" }}>
          <AnimatePresence initial={false}>
            {next && (
              <Card
                key={next.id + "-next"}
                idea={next}
                onSwipe={swipe}
                onTap={() => {}}
                onFounderClick={() => {}}
                isTop={false}
              />
            )}
            {current && (
              <Card
                key={current.id}
                idea={current}
                onSwipe={swipe}
                onTap={handleTap}
                onFounderClick={(w) => setProfileWallet(w)}
                isTop
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => swipe("left")}
            disabled={swiping}
            data-testid="swipe-left-btn"
            className="h-14 w-14 rounded-full glass-strong grid place-content-center transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(244,63,94,0.6)] hover:border-rose-500/60 active:scale-95 disabled:opacity-50"
            aria-label="Pass"
          >
            {swiping ? (
              <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
            ) : (
              <X className="h-6 w-6 text-rose-400" strokeWidth={2.5} />
            )}
          </button>
          <button
            onClick={handleSave}
            data-testid="swipe-save-btn"
            aria-label={currentSaved ? "Remove from saved" : "Save for later"}
            aria-pressed={currentSaved}
            className={`h-11 w-11 rounded-full grid place-content-center transition-all duration-300 hover:scale-105 active:scale-95 ${
              currentSaved
                ? "bg-yellow-400/20 border border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                : "glass hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)]"
            }`}
          >
            <Bookmark
              className={`h-4 w-4 ${currentSaved ? "fill-yellow-400 text-yellow-400" : "text-yellow-400"}`}
            />
          </button>
          <button
            onClick={handleTap}
            data-testid="swipe-info-btn"
            aria-label="View details"
            className="h-11 w-11 rounded-full glass grid place-content-center transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(96,165,250,0.5)] hover:border-blue-400/60 active:scale-95"
          >
            <Star className="h-4 w-4 text-blue-300" />
          </button>
          <button
            onClick={() => swipe("right")}
            disabled={swiping}
            data-testid="swipe-right-btn"
            className="h-14 w-14 rounded-full grid place-content-center bg-[var(--neon)] text-black transition-all duration-300 hover:scale-105 neon-glow active:scale-95 disabled:opacity-50"
            aria-label="Like"
          >
            {swiping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-6 w-6" strokeWidth={3} />
            )}
          </button>
        </div>
        {savedFlash && (
          <div className="text-xs text-yellow-300" data-testid="swipe-save-toast" role="status">
            {savedFlash === "saved" ? "Saved to your bookmarks" : "Removed from bookmarks"}
          </div>
        )}
      </div>

      <IdeaExpandView
        idea={expandedIdea}
        isOpen={!!expandedIdea}
        onClose={() => setExpandedIdea(null)}
        onSavedChange={onChanged}
        onFounderClick={(w) => setProfileWallet(w)}
        onSwipeRight={() => {
          swipe("right");
          setExpandedIdea(null);
        }}
      />
      <PublicProfileModal walletAddress={profileWallet} onClose={() => setProfileWallet(null)} />
    </>
  );
}
