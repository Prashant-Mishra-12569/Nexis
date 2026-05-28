import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/nexis/AppShell";
import { SwipeDeck } from "@/components/nexis/SwipeDeck";
import { Flame, Clock, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNexisData } from "@/hooks/useNexisData";
import { filterExpiredIdeas } from "@/lib/nexis/expiry";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

type SortKey = "trending" | "newest";

const industryFilters = ["DeFi", "AI", "RWA", "Consumer", "Gaming", "Infra", "DevTools", "Social"];

function FeedPage() {
  const { walletAddress } = useAuth();
  const { getUnswipedIdeas, loading, tablesReady, refreshIdeas } = useNexisData();
  const [sort, setSort] = useState<SortKey>("trending");
  const [industry, setIndustry] = useState<string | null>(null);

  // Get unswiped ideas from Tableland cache (excludes user's own ideas)
  const allIdeas = useMemo(
    () => filterExpiredIdeas(getUnswipedIdeas(walletAddress ?? undefined)),
    [getUnswipedIdeas, walletAddress],
  );

  const filtered = useMemo(() => {
    let list = allIdeas;
    if (industry) {
      list = list.filter((i) => i.industry.toLowerCase() === industry.toLowerCase());
    }
    if (sort === "trending") {
      list = [...list].sort((a, b) => b.matchScore - a.matchScore);
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [allIdeas, industry, sort]);

  return (
    <AppShell>
      <div className="px-4 md:px-8 pt-6 pb-2" data-testid="feed-page">
        <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
          <div>
            <div className="text-xs text-[var(--neon)] tracking-widest uppercase">Swipe Arena</div>
            <h1 className="font-display text-2xl md:text-3xl font-bold mt-0.5">Today's drops</h1>
          </div>
          {industry && (
            <button
              onClick={() => setIndustry(null)}
              data-testid="feed-clear-filter-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground hover:text-white"
            >
              <X className="h-3 w-3" /> Clear {industry}
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 mb-6 max-w-2xl mx-auto overflow-x-auto scrollbar-hide"
          data-testid="feed-filters"
        >
          <button
            onClick={() => setSort("trending")}
            data-testid="sort-trending"
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              sort === "trending"
                ? "bg-[var(--neon)] text-black"
                : "glass text-muted-foreground hover:text-white"
            }`}
          >
            <Flame className="h-3 w-3" /> Trending
          </button>
          <button
            onClick={() => setSort("newest")}
            data-testid="sort-newest"
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              sort === "newest"
                ? "bg-[var(--neon)] text-black"
                : "glass text-muted-foreground hover:text-white"
            }`}
          >
            <Clock className="h-3 w-3" /> Newest
          </button>
          {industryFilters.map((cat) => {
            const on = industry === cat;
            return (
              <button
                key={cat}
                onClick={() => setIndustry(on ? null : cat)}
                data-testid={`filter-${cat}`}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  on
                    ? "bg-[var(--neon)] text-black"
                    : "glass text-muted-foreground hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <SwipeDeck ideas={filtered} onChanged={() => refreshIdeas()} />
      </div>
    </AppShell>
  );
}
