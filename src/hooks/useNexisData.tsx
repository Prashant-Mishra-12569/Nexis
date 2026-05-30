/**
 * NexisDataContext — In-memory cache backed by Tableland
 * Components read from cache (sync), writes go to Tableland (async)
 * Falls back gracefully when Tableland tables are not yet set up.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { isTablesReady } from "@/lib/tableland/config";
import * as TProfiles from "@/lib/tableland/profiles";
import * as TIdeas from "@/lib/tableland/ideas";
import * as TMatches from "@/lib/tableland/matches";
import * as TSwipes from "@/lib/tableland/swipes";
import { useTablelandSigner } from "@/hooks/useTablelandSigner";
import { useAuth } from "@/hooks/useAuth";
import type { JsonRpcSigner } from "ethers";

// Re-export types for convenience
export type { UserProfile, BuilderProfile, InvestorProfile, Role } from "@/lib/tableland/profiles";
export type { Idea, TeamMember, Financials } from "@/lib/tableland/ideas";
export type { Match, MatchStatus, DealStatus } from "@/lib/tableland/matches";
export type { IdeaSentiment } from "@/lib/tableland/swipes";

interface NexisData {
  // State
  tablesReady: boolean;
  loading: boolean;
  ideas: TIdeas.Idea[];
  myProfile: TProfiles.UserProfile | null;
  myRole: "builder" | "investor" | null;
  matches: TMatches.Match[];
  swipedIds: { liked: string[]; disliked: string[] };
  savedIdeaIds: string[];

  // Read helpers
  getProfile: (wallet: string) => Promise<TProfiles.UserProfile | null>;
  getIdeasByOwner: (wallet: string) => Promise<TIdeas.Idea[]>;
  getUnswipedIdeas: (excludeWallet?: string) => TIdeas.Idea[];
  isIdeaSaved: (ideaId: string) => boolean;
  getSavedIdeas: () => TIdeas.Idea[];
  getIdeaSentiment: (ideaId: string) => Promise<TSwipes.IdeaSentiment>;

  // Write helpers (async — write to Tableland)
  saveProfile: (profile: TProfiles.UserProfile) => Promise<void>;
  addIdea: (idea: Omit<TIdeas.Idea, "id" | "createdAt" | "matchScore">) => Promise<TIdeas.Idea>;
  saveSwipe: (ideaId: string, liked: boolean) => Promise<void>;
  toggleSaved: (ideaId: string) => Promise<boolean>;
  createMatch: (data: Parameters<typeof TMatches.createMatch>[1]) => Promise<TMatches.Match | null>;
  updateMatch: (matchId: string, patch: Parameters<typeof TMatches.updateMatch>[2]) => Promise<void>;
  acceptMatch: (matchId: string) => Promise<void>;
  declineMatch: (matchId: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
  refreshIdeas: () => Promise<void>;
  refreshMatches: () => Promise<void>;
}

const NexisDataContext = createContext<NexisData | null>(null);

export function useNexisData(): NexisData {
  const ctx = useContext(NexisDataContext);
  if (!ctx) throw new Error("useNexisData must be used within NexisDataProvider");
  return ctx;
}

export function NexisDataProvider({ children }: { children: React.ReactNode }) {
  const { walletAddress } = useAuth();
  const signer = useTablelandSigner();

  const [tablesReady, setTablesReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<TIdeas.Idea[]>([]);
  const [myProfile, setMyProfile] = useState<TProfiles.UserProfile | null>(null);
  const [matches, setMatches] = useState<TMatches.Match[]>([]);
  const [swipedIds, setSwipedIds] = useState<{ liked: string[]; disliked: string[] }>({
    liked: [],
    disliked: [],
  });
  const [savedIdeaIds, setSavedIdeaIds] = useState<string[]>([]);

  const signerRef = useRef<JsonRpcSigner | undefined>(signer);
  signerRef.current = signer;

  const myRole = myProfile?.role ?? null;

  // Supabase storage is always online and ready
  useEffect(() => {
    setTablesReady(true);
  }, []);

  // Load all data from Tableland when tables become ready
  const loadAll = useCallback(async () => {
    if (!tablesReady || !walletAddress) return;
    setLoading(true);
    try {
      const [allIdeas, profile, mySwipes, mySaved] = await Promise.all([
        TIdeas.getIdeas(),
        TProfiles.getProfile(walletAddress),
        TSwipes.getSwipedIdeaIds(walletAddress),
        TSwipes.getSavedIdeaIds(walletAddress),
      ]);

      setIdeas(allIdeas);
      setMyProfile(profile);
      setSwipedIds(mySwipes);
      setSavedIdeaIds(mySaved);

      // Load matches based on role
      const role = profile?.role;
      if (role) {
        const myMatches = await TMatches.getMatchesForWallet(walletAddress, role);
        setMatches(myMatches);
      }
    } catch (e) {
      console.error("NexisData loadAll error:", e);
    } finally {
      setLoading(false);
    }
  }, [tablesReady, walletAddress]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Auto-refresh every 15 seconds for cross-device sync
  useEffect(() => {
    if (!tablesReady || !walletAddress) return;
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, [tablesReady, walletAddress, loadAll]);

  const refreshIdeas = useCallback(async () => {
    if (!tablesReady) return;
    const allIdeas = await TIdeas.getIdeas();
    setIdeas(allIdeas);
  }, [tablesReady]);

  const refreshMatches = useCallback(async () => {
    if (!tablesReady || !walletAddress || !myRole) return;
    const m = await TMatches.getMatchesForWallet(walletAddress, myRole);
    setMatches(m);
  }, [tablesReady, walletAddress, myRole]);

  // ===== Write functions =====

  const saveProfile = useCallback(
    async (profile: TProfiles.UserProfile) => {
      const s = signerRef.current;
      if (!s || !tablesReady) throw new Error("Not ready");
      await TProfiles.saveProfile(s, profile);
      setMyProfile(profile);
    },
    [tablesReady],
  );

  const addIdea = useCallback(
    async (idea: Omit<TIdeas.Idea, "id" | "createdAt" | "matchScore">) => {
      const s = signerRef.current;
      if (!s || !tablesReady) throw new Error("Not ready");
      const newIdea = await TIdeas.addIdea(s, idea);
      setIdeas((prev) => [newIdea, ...prev]);
      return newIdea;
    },
    [tablesReady],
  );

  const saveSwipe = useCallback(
    async (ideaId: string, liked: boolean) => {
      const s = signerRef.current;
      if (!s || !tablesReady || !walletAddress) return;
      await TSwipes.saveSwipe(s, walletAddress, ideaId, liked);
      setSwipedIds((prev) => ({
        liked: liked ? [...prev.liked, ideaId] : prev.liked,
        disliked: !liked ? [...prev.disliked, ideaId] : prev.disliked,
      }));

      // If liked, also create a match
      if (liked && myRole === "investor") {
        const idea = ideas.find((i) => i.id === ideaId);
        if (idea && idea.walletAddress) {
          const exists = await TMatches.matchExists(ideaId, walletAddress);
          if (!exists) {
            await createMatchFn({
              ideaId,
              ideaName: idea.name,
              industry: idea.industry,
              builderName: idea.founder,
              builderAvatar: idea.founder?.replace("@", "").slice(0, 2).toUpperCase() || "BR",
              builderWallet: idea.walletAddress,
              investorWallet: walletAddress,
              investorAvatar: walletAddress.slice(2, 4).toUpperCase(),
            });
          }
        }
      }
    },
    [tablesReady, walletAddress, myRole, ideas],
  );

  const toggleSaved = useCallback(
    async (ideaId: string) => {
      const s = signerRef.current;
      if (!s || !tablesReady || !walletAddress) return false;
      const nowSaved = await TSwipes.toggleSavedIdea(s, walletAddress, ideaId);
      setSavedIdeaIds((prev) =>
        nowSaved ? [...prev, ideaId] : prev.filter((id) => id !== ideaId),
      );
      return nowSaved;
    },
    [tablesReady, walletAddress],
  );

  const createMatchFn = useCallback(
    async (data: Parameters<typeof TMatches.createMatch>[1]) => {
      const s = signerRef.current;
      if (!s || !tablesReady) return null;
      const m = await TMatches.createMatch(s, data);
      setMatches((prev) => [m, ...prev]);
      return m;
    },
    [tablesReady],
  );

  const updateMatchFn = useCallback(
    async (matchId: string, patch: Parameters<typeof TMatches.updateMatch>[2]) => {
      const s = signerRef.current;
      if (!s || !tablesReady) return;
      await TMatches.updateMatch(s, matchId, patch);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, ...patch } : m)),
      );
    },
    [tablesReady],
  );

  const acceptMatch = useCallback(
    async (matchId: string) => {
      await updateMatchFn(matchId, { status: "accepted" });
    },
    [updateMatchFn],
  );

  const declineMatch = useCallback(
    async (matchId: string) => {
      await updateMatchFn(matchId, { status: "declined" });
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    },
    [updateMatchFn],
  );

  // ===== Read helpers =====

  const getProfile = useCallback(
    async (wallet: string) => {
      if (!tablesReady) return null;
      return TProfiles.getProfile(wallet);
    },
    [tablesReady],
  );

  const getIdeasByOwner = useCallback(
    async (wallet: string) => {
      if (!tablesReady) return [];
      return TIdeas.getIdeasByOwner(wallet);
    },
    [tablesReady],
  );

  const getUnswipedIdeas = useCallback(
    (excludeWallet?: string) => {
      const allSwiped = [...swipedIds.liked, ...swipedIds.disliked];
      const lowerWallet = excludeWallet?.toLowerCase();
      return ideas.filter((idea) => {
        if (allSwiped.includes(idea.id)) return false;
        if (lowerWallet && idea.walletAddress?.toLowerCase() === lowerWallet) return false;
        return true;
      });
    },
    [ideas, swipedIds],
  );

  const isIdeaSaved = useCallback(
    (ideaId: string) => savedIdeaIds.includes(ideaId),
    [savedIdeaIds],
  );

  const getSavedIdeas = useCallback(() => {
    return ideas.filter((i) => savedIdeaIds.includes(i.id));
  }, [ideas, savedIdeaIds]);

  const getIdeaSentiment = useCallback(
    async (ideaId: string) => {
      if (!tablesReady) return { likes: 0, dislikes: 0, views: 0 };
      return TSwipes.getIdeaSentiment(ideaId);
    },
    [tablesReady],
  );

  const value: NexisData = {
    tablesReady,
    loading,
    ideas,
    myProfile,
    myRole,
    matches,
    swipedIds,
    savedIdeaIds,
    getProfile,
    getIdeasByOwner,
    getUnswipedIdeas,
    isIdeaSaved,
    getSavedIdeas,
    getIdeaSentiment,
    saveProfile,
    addIdea,
    saveSwipe,
    toggleSaved,
    createMatch: createMatchFn,
    updateMatch: updateMatchFn,
    acceptMatch,
    declineMatch,
    refresh: loadAll,
    refreshIdeas,
    refreshMatches,
  };

  return <NexisDataContext.Provider value={value}>{children}</NexisDataContext.Provider>;
}
