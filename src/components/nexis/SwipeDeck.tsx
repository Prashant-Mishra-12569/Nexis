import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { X, Check, Star, Sparkles, RefreshCw, Bookmark, Loader2, ArrowUpRight } from "lucide-react";
import { IdeaExpandView } from "./IdeaExpandView";
import { useAuth } from "@/hooks/useAuth";
import { useNexisData, type Idea } from "@/hooks/useNexisData";
import { PublicProfileModal } from "./PublicProfileModal";
import { cn } from "@/lib/utils";

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
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

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
      className={cn(
        "absolute inset-0 origin-bottom select-none",
        isTop ? "z-10 cursor-grab active:cursor-grabbing" : "z-0"
      )}
      initial={{ scale: isTop ? 1 : 0.94, y: isTop ? 0 : 20, rotateX: isTop ? 0 : -8, opacity: isTop ? 1 : 0.4 }}
      animate={{ 
        scale: isTop ? 1 : 0.94, 
        y: isTop ? 0 : 20, 
        rotateX: isTop ? 0 : -8, 
        opacity: isTop ? 1 : 0.4,
        transition: { type: "spring", stiffness: 300, damping: 25 }
      }}
      exit={{ x: x.get() > 0 ? 600 : -600, opacity: 0, transition: { duration: 0.35, ease: "easeOut" } }}
    >
      <div
        onClick={isTop ? onTap : undefined}
        data-testid={isTop ? `card-${idea.id}` : undefined}
        className="relative w-full h-full rounded-[32px] overflow-hidden border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:border-[#00ff9d]/20"
      >
        <img
          src={idea.image}
          alt={idea.name}
          className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090b0a] via-[#090b0a]/50 to-transparent" />

        {/* Swipe Overlays */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-10 left-10 px-5 py-2.5 border-2 border-[#00ff9d] rounded-xl text-[#00ff9d] font-display font-black text-2xl tracking-widest rotate-[-12deg] shadow-[0_0_20px_rgba(0,255,157,0.3)] bg-[#090b0a]/80 backdrop-blur-sm"
        >
          ACCEPTS
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-10 right-10 px-5 py-2.5 border-2 border-rose-500 rounded-xl text-rose-500 font-display font-black text-2xl tracking-widest rotate-[12deg] shadow-[0_0_20px_rgba(244,63,94,0.3)] bg-[#090b0a]/80 backdrop-blur-sm"
        >
          PASS
        </motion.div>

        {/* Top Badges */}
        <div className="absolute top-4 inset-x-4 md:top-6 md:inset-x-6 flex items-center justify-between">
          <span className="bg-white/5 border border-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white/80">
            {idea.industry}
          </span>
          <span className="flex items-center gap-1.5 bg-[#00ff9d]/10 border border-[#00ff9d]/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-[#00ff9d] shadow-[0_0_10px_rgba(0,255,157,0.05)]">
            <Sparkles className="h-3 w-3 animate-pulse" /> {idea.matchScore}% Match
          </span>
        </div>

        {/* Card Metadata Section */}
        <div className="absolute bottom-0 inset-x-0 p-5 md:p-8 space-y-3 md:space-y-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (idea.walletAddress) onFounderClick(idea.walletAddress);
            }}
            data-testid={`card-founder-${idea.id}`}
            className="group/btn flex items-center gap-1 text-[#00ff9d] text-xs font-black uppercase tracking-wider bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 border border-[#00ff9d]/20 px-3.5 py-1.5 rounded-full shadow-sm transition-all"
          >
            {idea.founder}{" "}
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>
          
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl md:text-3xl font-black leading-tight text-white">{idea.name}</h2>
            <p className="text-xs md:text-sm text-white/70 leading-relaxed font-semibold">{idea.tagline}</p>
          </div>
          
          <div className="flex items-center gap-2.5 md:gap-3 pt-3 border-t border-white/5 select-none">
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Required Pool</span>
            <span className="font-display font-black text-xl md:text-2xl text-white">{idea.ask}</span>
            <span className="text-[10px] md:text-xs font-bold text-[#00ff9d] bg-[#00ff9d]/10 px-2.5 py-0.5 rounded-full border border-[#00ff9d]/20">{idea.equity} Equity</span>
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
        <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-8 text-center shadow-xl">
          <Loader2 className="h-12 w-12 text-[#00ff9d] mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-2xl font-bold mb-2 text-white">Syncing Network…</h3>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            Mantle database storage structures need setup initialization.
          </p>
          <a
            href="/setup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#00ff9d] text-black font-extrabold hover:scale-105 transition-all text-xs"
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
        <div className="border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-[#00ff9d]/10 border border-[#00ff9d]/20 grid place-content-center mx-auto mb-5">
            <Sparkles className="h-8 w-8 text-[#00ff9d]" />
          </div>
          <h3 className="font-display text-2xl font-black text-white mb-2">Feed Fully Cleared</h3>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            {ideas.length === 0
              ? "No startup ideas are active on-chain right now. Builders need to publish listings first."
              : "You've successfully evaluated all listings in the queue. Refresh to pull new telemetry."}
          </p>
          <button
            onClick={handleReset}
            data-testid="feed-reset-btn"
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-full bg-[#00ff9d] text-black font-extrabold hover:scale-105 transition-all text-xs cursor-pointer shadow-[0_0_15px_rgba(0,255,157,0.3)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Swipe Stack
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="w-full max-w-md mx-auto flex flex-col items-center gap-4 sm:gap-6 md:gap-8"
        data-testid="feed-deck"
      >
        {/* 3D Stack Container */}
        <div className="relative w-full perspective-[1000px] h-[44vh] sm:h-[50vh] md:h-[55vh] lg:h-[60vh] max-h-[500px] min-h-[300px]">
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

        {/* Premium Floating Console Bar */}
        <div className="flex items-center gap-5 border border-white/[0.08] bg-[#090b0a]/75 backdrop-blur-xl px-6 py-4 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Pass Button */}
          <button
            onClick={() => swipe("left")}
            disabled={swiping}
            data-testid="swipe-left-btn"
            className="h-12 w-12 rounded-full border border-white/10 bg-white/[0.02] hover:bg-rose-500/10 hover:border-rose-500/40 grid place-content-center transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer text-rose-400"
            aria-label="Pass"
          >
            {swiping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <X className="h-5 w-5" strokeWidth={2.5} />
            )}
          </button>
          
          {/* Bookmark Button */}
          <button
            onClick={handleSave}
            data-testid="swipe-save-btn"
            aria-label={currentSaved ? "Remove from saved" : "Save for later"}
            aria-pressed={currentSaved}
            className={cn(
              "h-10 w-10 rounded-full grid place-content-center transition-all duration-300 hover:scale-115 active:scale-90 cursor-pointer",
              currentSaved
                ? "bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]"
                : "border border-white/10 bg-white/[0.02] text-yellow-400 hover:border-yellow-400/30 hover:bg-yellow-400/5"
            )}
          >
            <Bookmark
              className={cn("h-4 w-4", currentSaved ? "fill-yellow-400" : "")}
            />
          </button>
          
          {/* Expand Details Button */}
          <button
            onClick={handleTap}
            data-testid="swipe-info-btn"
            aria-label="View details"
            className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.02] hover:bg-blue-500/5 hover:border-blue-400/30 grid place-content-center transition-all duration-300 hover:scale-115 active:scale-90 cursor-pointer text-blue-300"
          >
            <Star className="h-4 w-4" />
          </button>
          
          {/* Accept Button */}
          <button
            onClick={() => swipe("right")}
            disabled={swiping}
            data-testid="swipe-right-btn"
            className="h-12 w-12 rounded-full grid place-content-center bg-[#00ff9d] text-black shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer font-black"
            aria-label="Like"
          >
            {swiping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" strokeWidth={3} />
            )}
          </button>
        </div>
        
        {savedFlash && (
          <div className="text-xs font-bold text-yellow-300 animate-pulse" data-testid="swipe-save-toast" role="status">
            {savedFlash === "saved" ? "Added to active bookmarks" : "Removed from bookmarks"}
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
