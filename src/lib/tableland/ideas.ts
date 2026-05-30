/**
 * Ideas CRUD — migrated from Tableland to Supabase
 */
import { supabase } from "../supabase/client";
import type { JsonRpcSigner } from "ethers";

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
  pitchVideoUrl?: string;
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

/**
 * Get all ideas
 */
export async function getIdeas(): Promise<Idea[]> {
  try {
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("getIdeas error:", error);
      return [];
    }
    return (data || []).map(rowToIdea);
  } catch (e) {
    console.error("getIdeas unexpected error:", e);
    return [];
  }
}

/**
 * Get ideas by owner wallet
 */
export async function getIdeasByOwner(walletAddress: string): Promise<Idea[]> {
  if (!walletAddress) return [];
  try {
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .order("created_at", { ascending: false });
    if (error) {
      console.error("getIdeasByOwner error:", error);
      return [];
    }
    return (data || []).map(rowToIdea);
  } catch {
    return [];
  }
}

/**
 * Get a single idea by ID
 */
export async function getIdeaById(ideaId: string): Promise<Idea | null> {
  if (!ideaId) return null;
  try {
    const { data, error } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .maybeSingle();
    if (error) {
      console.error("getIdeaById error:", error);
      return null;
    }
    return data ? rowToIdea(data) : null;
  } catch {
    return null;
  }
}

/**
 * Add a new idea
 */
export async function addIdea(
  signer: JsonRpcSigner | undefined,
  idea: Omit<Idea, "id" | "createdAt" | "matchScore">,
): Promise<Idea> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const matchScore = Math.floor(Math.random() * 20) + 75;

  const payload = {
    id,
    name: idea.name,
    tagline: idea.tagline || "",
    description: idea.description || "",
    industry: idea.industry || "",
    stage: idea.stage || "",
    ask: idea.ask || "",
    equity: idea.equity || "",
    image: idea.image || "",
    founder: idea.founder || "",
    founder_avatar: idea.founderAvatar || "",
    wallet_address: (idea.walletAddress || "").toLowerCase(),
    match_score: matchScore,
    created_at: now,
    pitch_deck_url: idea.pitchDeckUrl || "",
    pitch_video_url: idea.pitchVideoUrl || "",
    team_members: idea.teamMembers || [],
    financials: idea.financials || {},
    linkedin: idea.linkedIn || "",
    twitter: idea.twitter || "",
    website: idea.website || "",
    ipfs_hash: idea.ipfsHash || "",
  };

  const { error } = await supabase
    .from("ideas")
    .insert(payload);

  if (error) {
    console.error("addIdea error:", error);
    throw error;
  }

  return { ...idea, id, createdAt: new Date(now), matchScore };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToIdea(row: any): Idea {
  return {
    id: row.id,
    name: row.name || "",
    tagline: row.tagline || "",
    description: row.description || "",
    industry: row.industry || "",
    stage: row.stage || "",
    ask: row.ask || "",
    equity: row.equity || "",
    image: row.image || "",
    founder: row.founder || "",
    founderAvatar: row.founder_avatar || "",
    walletAddress: row.wallet_address || "",
    matchScore: row.match_score || 80,
    createdAt: new Date(Number(row.created_at || 0)),
    pitchDeckUrl: row.pitch_deck_url || "",
    pitchVideoUrl: row.pitch_video_url || "",
    teamMembers: Array.isArray(row.team_members) ? row.team_members : [],
    financials: row.financials || {},
    linkedIn: row.linkedin || "",
    twitter: row.twitter || "",
    website: row.website || "",
    ipfsHash: row.ipfs_hash || "",
  };
}
