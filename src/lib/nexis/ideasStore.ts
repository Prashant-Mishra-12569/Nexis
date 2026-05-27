/**
 * Ideas Store - Dynamic storage for startup ideas
 * Uses localStorage for persistence with React state for reactivity
 */

export interface Idea {
  id: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  stage: string;
  ask: string;
  equity: string;
  image: string;
  founder: string;
  founderAvatar?: string;
  walletAddress?: string;
  matchScore: number;
  createdAt: Date;
  pitchDeckUrl?: string;
  teamMembers?: TeamMember[];
  financials?: Financials;
  linkedIn?: string;
  twitter?: string;
  website?: string;
  ipfsHash?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  avatar?: string;
  linkedIn?: string;
}

export interface Financials {
  revenue?: string;
  burn?: string;
  runway?: string;
  previousRaise?: string;
}

const STORAGE_KEY = "nexis_ideas";
const SWIPES_KEY = "nexis_swipes";
const MATCHES_KEY = "nexis_matches";
const VIEWS_KEY = "nexis_idea_views";
const SENTIMENT_KEY = "nexis_idea_sentiment";
const SAVED_KEY = "nexis_saved_ideas";

// Default seed ideas for demo
const defaultIdeas: Idea[] = [
  {
    id: "1",
    name: "Lattice Protocol",
    tagline: "Cross-chain liquidity routing built for AI agents.",
    description:
      "Lattice Protocol enables AI agents to autonomously route liquidity across multiple chains with minimal slippage. Our smart routing algorithm analyzes 50+ DEXs in real-time to find optimal paths for any trade size.",
    industry: "DeFi",
    stage: "Seed",
    ask: "$250K",
    equity: "6%",
    image:
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=60",
    founder: "@rhea.eth",
    walletAddress: "0x1234...5678",
    matchScore: 94,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    teamMembers: [
      { name: "Rhea Chen", role: "CEO & Founder", linkedIn: "https://linkedin.com/in/rheachen" },
      { name: "Marcus Webb", role: "CTO", linkedIn: "https://linkedin.com/in/marcuswebb" },
    ],
    financials: {
      revenue: "$0 (Pre-revenue)",
      burn: "$15K/mo",
      runway: "8 months",
      previousRaise: "$50K (Friends & Family)",
    },
  },
  {
    id: "2",
    name: "Voxel Studios",
    tagline: "AI-powered 3D asset generation for gaming.",
    description:
      "Generate production-ready 3D game assets in minutes using our proprietary AI models. Trained on 10M+ assets, Voxel delivers AAA-quality models at indie budgets.",
    industry: "AI",
    stage: "Pre-seed",
    ask: "$500K",
    equity: "10%",
    image:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=60",
    founder: "@kai.lens",
    walletAddress: "0x2345...6789",
    matchScore: 87,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    teamMembers: [
      { name: "Kai Nakamoto", role: "CEO", linkedIn: "https://linkedin.com/in/kainakamoto" },
    ],
    financials: {
      revenue: "$2K MRR",
      burn: "$20K/mo",
      runway: "6 months",
    },
  },
  {
    id: "3",
    name: "ChainGuard",
    tagline: "Real-time smart contract security monitoring.",
    description:
      "ChainGuard provides 24/7 monitoring of your deployed smart contracts, detecting exploits and vulnerabilities before they're exploited. Trusted by 50+ protocols with $2B+ TVL.",
    industry: "Security",
    stage: "Series A",
    ask: "$2M",
    equity: "8%",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=60",
    founder: "@security.eth",
    walletAddress: "0x3456...7890",
    matchScore: 91,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    teamMembers: [
      { name: "Alex Rivera", role: "CEO", linkedIn: "https://linkedin.com/in/alexrivera" },
      { name: "Sarah Kim", role: "Head of Security", linkedIn: "https://linkedin.com/in/sarahkim" },
      { name: "Dev Patel", role: "Lead Engineer", linkedIn: "https://linkedin.com/in/devpatel" },
    ],
    financials: {
      revenue: "$50K MRR",
      burn: "$80K/mo",
      runway: "18 months",
      previousRaise: "$500K Seed",
    },
  },
  {
    id: "4",
    name: "PayFlow",
    tagline: "Instant crypto payroll for remote teams.",
    description:
      "Pay your global team in crypto or fiat with one click. Automatic tax compliance, multi-chain support, and instant off-ramps to 150+ countries.",
    industry: "Payments",
    stage: "Seed",
    ask: "$1M",
    equity: "12%",
    image:
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=60",
    founder: "@maria.base",
    walletAddress: "0x4567...8901",
    matchScore: 82,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    teamMembers: [
      { name: "Maria Santos", role: "CEO", linkedIn: "https://linkedin.com/in/mariasantos" },
      { name: "Tom Chen", role: "CTO", linkedIn: "https://linkedin.com/in/tomchen" },
    ],
    financials: {
      revenue: "$10K MRR",
      burn: "$40K/mo",
      runway: "12 months",
    },
  },
  {
    id: "5",
    name: "MetaVerse Realty",
    tagline: "Tokenized real-world real estate on-chain.",
    description:
      "Fractional ownership of premium real estate properties. Buy, sell, and trade property tokens with instant settlement and full legal compliance.",
    industry: "RWA",
    stage: "Pre-seed",
    ask: "$750K",
    equity: "15%",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=60",
    founder: "@realty.eth",
    walletAddress: "0x5678...9012",
    matchScore: 78,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    teamMembers: [{ name: "James Liu", role: "CEO", linkedIn: "https://linkedin.com/in/jamesliu" }],
    financials: {
      revenue: "$0 (Pre-launch)",
      burn: "$25K/mo",
      runway: "10 months",
    },
  },
];

// Get ideas from localStorage or return defaults
export function getIdeas(): Idea[] {
  if (typeof window === "undefined") return defaultIdeas;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultIdeas));
    return defaultIdeas;
  }

  try {
    const parsed = JSON.parse(stored);
    return parsed.map((idea: Idea) => ({
      ...idea,
      createdAt: new Date(idea.createdAt),
    }));
  } catch {
    return defaultIdeas;
  }
}

// Save ideas to localStorage
export function saveIdeas(ideas: Idea[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
}

// Add a new idea
export function addIdea(idea: Omit<Idea, "id" | "createdAt" | "matchScore">): Idea {
  const ideas = getIdeas();
  const newIdea: Idea = {
    ...idea,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    matchScore: Math.floor(Math.random() * 20) + 75, // 75-95 random score
  };

  ideas.unshift(newIdea);
  saveIdeas(ideas);
  return newIdea;
}

// Get swipes (liked/disliked ideas)
export function getSwipes(): { liked: string[]; disliked: string[] } {
  if (typeof window === "undefined") return { liked: [], disliked: [] };

  const stored = localStorage.getItem(SWIPES_KEY);
  if (!stored) return { liked: [], disliked: [] };

  try {
    return JSON.parse(stored);
  } catch {
    return { liked: [], disliked: [] };
  }
}

// Save swipe action
export function saveSwipe(ideaId: string, liked: boolean): void {
  if (typeof window === "undefined") return;

  const swipes = getSwipes();

  if (liked) {
    if (!swipes.liked.includes(ideaId)) {
      swipes.liked.push(ideaId);
    }
  } else {
    if (!swipes.disliked.includes(ideaId)) {
      swipes.disliked.push(ideaId);
    }
  }

  localStorage.setItem(SWIPES_KEY, JSON.stringify(swipes));

  // Track aggregate sentiment per idea
  recordSentiment(ideaId, liked);

  // If liked, create a match
  if (liked) {
    createMatch(ideaId);
  }
}

// ===== Saved (bookmarked) ideas — for later viewing =====

interface SavedMap {
  [ideaId: string]: number; // saved-at timestamp
}

function readSavedMap(): SavedMap {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(SAVED_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSavedMap(map: SavedMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_KEY, JSON.stringify(map));
}

export function isIdeaSaved(ideaId: string): boolean {
  return Boolean(readSavedMap()[ideaId]);
}

export function toggleSavedIdea(ideaId: string): boolean {
  const map = readSavedMap();
  if (map[ideaId]) {
    delete map[ideaId];
    writeSavedMap(map);
    return false;
  }
  map[ideaId] = Date.now();
  writeSavedMap(map);
  return true;
}

export function getSavedIdeas(): Idea[] {
  const map = readSavedMap();
  const ideas = getIdeas();
  return ideas.filter((i) => map[i.id]).sort((a, b) => (map[b.id] ?? 0) - (map[a.id] ?? 0));
}

// ===== Aggregate sentiment (likes/dislikes per idea) =====
export interface IdeaSentiment {
  likes: number;
  dislikes: number;
}

function readSentimentMap(): Record<string, IdeaSentiment> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(SENTIMENT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function recordSentiment(ideaId: string, liked: boolean): void {
  if (typeof window === "undefined") return;
  const map = readSentimentMap();
  const cur = map[ideaId] ?? { likes: 0, dislikes: 0 };
  if (liked) cur.likes += 1;
  else cur.dislikes += 1;
  map[ideaId] = cur;
  localStorage.setItem(SENTIMENT_KEY, JSON.stringify(map));
}

export function getIdeaSentiment(ideaId: string): IdeaSentiment {
  return readSentimentMap()[ideaId] ?? { likes: 0, dislikes: 0 };
}

// ===== View counter per idea =====
function readViewsMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(VIEWS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function incrementIdeaView(ideaId: string): void {
  if (typeof window === "undefined") return;
  const map = readViewsMap();
  map[ideaId] = (map[ideaId] ?? 0) + 1;
  localStorage.setItem(VIEWS_KEY, JSON.stringify(map));
}

export function getIdeaViews(ideaId: string): number {
  return readViewsMap()[ideaId] ?? 0;
}

// Get unswipped ideas for feed
export function getUnswipedIdeas(excludeWallet?: string | null): Idea[] {
  const ideas = getIdeas();
  const swipes = getSwipes();
  const swipedIds = [...swipes.liked, ...swipes.disliked];
  const lowerWallet = excludeWallet?.toLowerCase();

  return ideas.filter((idea) => {
    if (swipedIds.includes(idea.id)) return false;
    if (lowerWallet && idea.walletAddress?.toLowerCase() === lowerWallet) return false;
    return true;
  });
}

// Get ideas owned by a specific wallet
export function getIdeasByOwner(walletAddress: string | null | undefined): Idea[] {
  if (!walletAddress) return [];
  const lower = walletAddress.toLowerCase();
  return getIdeas().filter((i) => i.walletAddress?.toLowerCase() === lower);
}

// Sum of right-swipes received across all ideas owned by wallet
export function getReceivedRightSwipes(walletAddress: string | null | undefined): number {
  return getIdeasByOwner(walletAddress).reduce(
    (acc, idea) => acc + getIdeaSentiment(idea.id).likes,
    0,
  );
}

// Total views across all ideas owned by wallet
export function getOwnerTotalViews(walletAddress: string | null | undefined): number {
  return getIdeasByOwner(walletAddress).reduce((acc, idea) => acc + getIdeaViews(idea.id), 0);
}

// Match management
export interface Match {
  id: string;
  ideaId: string;
  ideaName: string;
  founderName: string;
  founderAvatar: string;
  matchedAt: Date;
  lastMessage?: string;
  unread: boolean;
  walletAddress?: string;
}

export function getMatches(): Match[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(MATCHES_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return parsed.map((match: Match) => ({
      ...match,
      matchedAt: new Date(match.matchedAt),
    }));
  } catch {
    return [];
  }
}

function createMatch(ideaId: string): void {
  const ideas = getIdeas();
  const idea = ideas.find((i) => i.id === ideaId);
  if (!idea) return;

  const matches = getMatches();

  // Don't create duplicate match
  if (matches.some((m) => m.ideaId === ideaId)) return;

  const newMatch: Match = {
    id: crypto.randomUUID(),
    ideaId: idea.id,
    ideaName: idea.name,
    founderName: idea.founder,
    founderAvatar: idea.founder.slice(1, 3).toUpperCase(),
    matchedAt: new Date(),
    lastMessage: `You matched with ${idea.name}!`,
    unread: true,
    walletAddress: idea.walletAddress,
  };

  matches.unshift(newMatch);
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export function markMatchRead(matchId: string): void {
  if (typeof window === "undefined") return;
  const matches = getMatches();
  const idx = matches.findIndex((m) => m.id === matchId);
  if (idx < 0) return;
  matches[idx] = { ...matches[idx], unread: false };
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export function declineMatch(matchId: string): void {
  if (typeof window === "undefined") return;
  const remaining = getMatches().filter((m) => m.id !== matchId);
  localStorage.setItem(MATCHES_KEY, JSON.stringify(remaining));
}

export function updateMatchLastMessage(matchId: string, lastMessage: string): void {
  if (typeof window === "undefined") return;
  const matches = getMatches();
  const idx = matches.findIndex((m) => m.id === matchId);
  if (idx < 0) return;
  matches[idx] = { ...matches[idx], lastMessage };
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

// Clear all data (for testing)
export function clearAllData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SWIPES_KEY);
  localStorage.removeItem(MATCHES_KEY);
  localStorage.removeItem(VIEWS_KEY);
  localStorage.removeItem(SENTIMENT_KEY);
  localStorage.removeItem(SAVED_KEY);
}

// Reset to default ideas
export function resetToDefaults(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultIdeas));
  localStorage.removeItem(SWIPES_KEY);
  localStorage.removeItem(MATCHES_KEY);
  localStorage.removeItem(VIEWS_KEY);
  localStorage.removeItem(SENTIMENT_KEY);
  localStorage.removeItem(SAVED_KEY);
}
