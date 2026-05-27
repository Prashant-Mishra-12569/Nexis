import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { X, Check, Star, Sparkles, RefreshCw } from "lucide-react";
import {
  getUnswipedIdeas,
  saveSwipe,
  resetToDefaults,
  incrementIdeaView,
  type Idea,
} from "@/lib/nexis/ideasStore";
import { IdeaExpandView } from "./IdeaExpandView";

function Card({
  idea,
  onSwipe,
  onTap,
  isTop,
}: {
  idea: Idea;
  onSwipe: (dir: "left" | "right") => void;
  onTap: () => void;
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
          <div className="text-[var(--neon)] text-sm font-medium">{idea.founder}</div>
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
  const [internalIdeas, setInternalIdeas] = useState<Idea[]>([]);
  const [index, setIndex] = useState(0);
  const [expandedIdea, setExpandedIdea] = useState<Idea | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  const ideas = controlled ? externalIdeas! : internalIdeas;

  // Uncontrolled fetch
  useEffect(() => {
    if (!controlled) {
      setInternalIdeas(getUnswipedIdeas());
    }
  }, [controlled]);

  // Reset index when controlled list changes shape
  useEffect(() => {
    setIndex(0);
  }, [controlled, externalIdeas?.length]);

  const current = ideas[index];
  const next = ideas[index + 1];
  const hasIdeas = ideas.length > 0 && index < ideas.length;

  // Track view of current idea (only once per session per idea)
  useEffect(() => {
    if (!current) return;
    if (viewedRef.current.has(current.id)) return;
    viewedRef.current.add(current.id);
    incrementIdeaView(current.id);
  }, [current]);

  function swipe(dir: "left" | "right") {
    if (!current) return;
    saveSwipe(current.id, dir === "right");
    setIndex((i) => i + 1);
    onChanged?.();
  }

  function handleTap() {
    if (current) setExpandedIdea(current);
  }

  function handleReset() {
    resetToDefaults();
    viewedRef.current.clear();
    if (!controlled) setInternalIdeas(getUnswipedIdeas());
    setIndex(0);
    onChanged?.();
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
              ? "No ideas match your current filter. Try clearing it or seeding fresh ideas below."
              : "Check back later for new startups or refresh the feed."}
          </p>
          <button
            onClick={handleReset}
            data-testid="feed-reset-btn"
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Feed
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
                isTop={false}
              />
            )}
            {current && (
              <Card key={current.id} idea={current} onSwipe={swipe} onTap={handleTap} isTop />
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => swipe("left")}
            data-testid="swipe-left-btn"
            className="h-14 w-14 rounded-full glass-strong grid place-content-center transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(244,63,94,0.6)] hover:border-rose-500/60 active:scale-95"
          >
            <X className="h-6 w-6 text-rose-400" strokeWidth={2.5} />
          </button>
          <button
            onClick={handleTap}
            data-testid="swipe-info-btn"
            className="h-11 w-11 rounded-full glass grid place-content-center transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] hover:border-yellow-400/60 active:scale-95"
            aria-label="View details"
          >
            <Star className="h-4 w-4 text-yellow-400" />
          </button>
          <button
            onClick={() => swipe("right")}
            data-testid="swipe-right-btn"
            className="h-14 w-14 rounded-full grid place-content-center bg-[var(--neon)] text-black transition-all duration-300 hover:scale-105 neon-glow active:scale-95"
          >
            <Check className="h-6 w-6" strokeWidth={3} />
          </button>
        </div>
      </div>

      <IdeaExpandView
        idea={expandedIdea}
        isOpen={!!expandedIdea}
        onClose={() => setExpandedIdea(null)}
        onSwipeRight={() => {
          swipe("right");
          setExpandedIdea(null);
        }}
      />
    </>
  );
}
