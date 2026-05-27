import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  FileText,
  Users,
  DollarSign,
  ExternalLink,
  Linkedin,
  ChevronRight,
} from "lucide-react";
import type { Idea } from "@/lib/nexis/ideasStore";

interface IdeaExpandViewProps {
  idea: Idea | null;
  isOpen: boolean;
  onClose: () => void;
  onSwipeRight?: () => void;
}

type TabType = "overview" | "team" | "financials";

export function IdeaExpandView({ idea, isOpen, onClose, onSwipeRight }: IdeaExpandViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  if (!idea) return null;

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "team", label: "Team", icon: Users },
    { id: "financials", label: "Financials", icon: DollarSign },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden"
          />

          {/* Mobile: Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 md:hidden max-h-[85vh] overflow-hidden rounded-t-3xl glass-strong"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-5 pb-4 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--neon)] text-sm font-medium">{idea.founder}</div>
                  <h2 className="font-display text-2xl font-bold mt-1">{idea.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{idea.tagline}</p>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full glass grid place-content-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all ${
                      activeTab === tab.id
                        ? "text-[var(--neon)] border-b-2 border-[var(--neon)]"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[50vh]">
              <TabContent idea={idea} activeTab={activeTab} />
            </div>

            {/* CTA */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  onSwipeRight?.();
                  onClose();
                }}
                className="w-full py-3 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-[1.02] active:scale-95 transition-all"
              >
                I'm Interested
              </button>
            </div>
          </motion.div>

          {/* Desktop: Side Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="hidden md:flex fixed right-0 top-0 bottom-0 w-[420px] z-50 flex-col glass-strong border-l border-white/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[var(--neon)] text-sm font-medium">{idea.founder}</div>
                  <h2 className="font-display text-2xl font-bold mt-1">{idea.name}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="h-9 w-9 rounded-full glass grid place-content-center hover:neon-border transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">{idea.tagline}</p>
              <div className="flex items-center gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--neon)]/10 text-[var(--neon)] neon-border">
                  {idea.industry}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs glass">
                  {idea.matchScore}% Match
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all ${
                      activeTab === tab.id
                        ? "text-[var(--neon)] border-b-2 border-[var(--neon)]"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <TabContent idea={idea} activeTab={activeTab} />
            </div>

            {/* CTA */}
            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => {
                  onSwipeRight?.();
                  onClose();
                }}
                className="w-full py-3.5 rounded-full bg-[var(--neon)] text-black font-semibold neon-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                I'm Interested <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TabContent({ idea, activeTab }: { idea: Idea; activeTab: TabType }) {
  if (activeTab === "overview") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-2">About</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{idea.description}</p>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-2">Stage</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{idea.stage}</p>
        </div>
        {idea.website && (
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-2">Website</h3>
            <a
              href={idea.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-white hover:text-[var(--neon)] transition-colors"
            >
              Visit Website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "team") {
    const teamMembers = idea.teamMembers || [
      { name: idea.founder.replace("@", ""), role: "Founder & CEO" },
    ];

    return (
      <div className="space-y-6">
        {/* Intro Video Placeholder */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-3">
            Founder Intro
          </h3>
          <div className="aspect-video rounded-xl bg-black/50 border border-white/10 flex items-center justify-center cursor-pointer hover:border-[var(--neon)]/50 transition-colors group">
            <div className="h-14 w-14 rounded-full bg-[var(--neon)]/20 grid place-content-center group-hover:bg-[var(--neon)]/30 transition-colors">
              <Play className="h-6 w-6 text-[var(--neon)] ml-1" />
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-3">Team</h3>
          <div className="space-y-3">
            {teamMembers.map((member, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--neon)] to-emerald-800 grid place-content-center text-sm font-bold text-black">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.role}</div>
                </div>
                {member.linkedIn && (
                  <a
                    href={member.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-full glass grid place-content-center hover:neon-border transition-all"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "financials") {
    const financials = idea.financials;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Raising</div>
            <div className="font-display text-2xl font-bold text-[var(--neon)]">{idea.ask}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Equity</div>
            <div className="font-display text-2xl font-bold">{idea.equity}</div>
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Implied Valuation</div>
          <div className="font-display text-xl font-bold">
            $
            {(
              (parseInt(idea.ask.replace(/[^0-9]/g, "")) /
                parseInt(idea.equity.replace(/[^0-9]/g, ""))) *
              100
            ).toLocaleString()}
          </div>
        </div>

        {financials && (
          <div className="space-y-3">
            {financials.revenue && (
              <div className="glass rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Revenue</span>
                <span className="font-medium">{financials.revenue}</span>
              </div>
            )}
            {financials.burn && (
              <div className="glass rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Monthly Burn</span>
                <span className="font-medium">{financials.burn}</span>
              </div>
            )}
            {financials.runway && (
              <div className="glass rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Runway</span>
                <span className="font-medium">{financials.runway}</span>
              </div>
            )}
            {financials.previousRaise && (
              <div className="glass rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Previous Raise</span>
                <span className="font-medium">{financials.previousRaise}</span>
              </div>
            )}
          </div>
        )}

        {/* Pitch Deck */}
        {idea.pitchDeckUrl && (
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[var(--neon)] mb-3">
              Pitch Deck
            </h3>
            <a
              href={idea.pitchDeckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-xl p-6 flex flex-col items-center gap-3 border border-dashed border-white/20 hover:border-[var(--neon)]/50 transition-colors block"
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm text-center">
                <span className="text-white">View Pitch Deck</span>
              </div>
              <span className="px-4 py-2 rounded-full glass text-sm flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </span>
            </a>
          </div>
        )}
      </div>
    );
  }

  return null;
}
