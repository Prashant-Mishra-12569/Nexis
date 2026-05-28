/**
 * Tableland Ideas CRUD — replaces localStorage ideasStore for ideas
 */
import { getReadOnlyDatabase, getDatabase } from "./client";
import { getTableNames } from "./config";
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
 * Get all ideas (free read)
 */
export async function getIdeas(): Promise<Idea[]> {
  const tables = getTableNames();
  if (!tables) return [];
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT * FROM ${tables.ideas} ORDER BY created_at DESC;`)
      .all();
    return results.map(rowToIdea);
  } catch (e) {
    console.error("getIdeas error:", e);
    return [];
  }
}

/**
 * Get ideas by owner wallet
 */
export async function getIdeasByOwner(walletAddress: string): Promise<Idea[]> {
  const tables = getTableNames();
  if (!tables) return [];
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT * FROM ${tables.ideas} WHERE LOWER(wallet_address) = ?1 ORDER BY created_at DESC;`)
      .bind(walletAddress.toLowerCase())
      .all();
    return results.map(rowToIdea);
  } catch {
    return [];
  }
}

/**
 * Get a single idea by ID
 */
export async function getIdeaById(ideaId: string): Promise<Idea | null> {
  const tables = getTableNames();
  if (!tables) return null;
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT * FROM ${tables.ideas} WHERE id = ?1;`)
      .bind(ideaId)
      .all();
    return results.length > 0 ? rowToIdea(results[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Add a new idea (on-chain write)
 */
export async function addIdea(
  signer: JsonRpcSigner,
  idea: Omit<Idea, "id" | "createdAt" | "matchScore">,
): Promise<Idea> {
  const tables = getTableNames();
  if (!tables) throw new Error("Tables not set up");

  const db = getDatabase(signer);
  const id = crypto.randomUUID();
  const now = Date.now();
  const matchScore = Math.floor(Math.random() * 20) + 75;

  const { meta } = await db
    .prepare(
      `INSERT INTO ${tables.ideas}
        (id, name, tagline, description, industry, stage, ask, equity, image,
         founder, founder_avatar, wallet_address, match_score, created_at,
         pitch_deck_url, pitch_video_url, team_members, financials,
         linkedin, twitter, website, ipfs_hash)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22);`,
    )
    .bind(
      id,
      idea.name,
      idea.tagline || "",
      idea.description || "",
      idea.industry || "",
      idea.stage || "",
      idea.ask || "",
      idea.equity || "",
      idea.image || "",
      idea.founder || "",
      idea.founderAvatar || "",
      idea.walletAddress || "",
      matchScore,
      now,
      idea.pitchDeckUrl || "",
      idea.pitchVideoUrl || "",
      JSON.stringify(idea.teamMembers || []),
      JSON.stringify(idea.financials || {}),
      idea.linkedIn || "",
      idea.twitter || "",
      idea.website || "",
      idea.ipfsHash || "",
    )
    .run();
  await meta.txn?.wait();

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
    createdAt: new Date(row.created_at || 0),
    pitchDeckUrl: row.pitch_deck_url || "",
    pitchVideoUrl: row.pitch_video_url || "",
    teamMembers: safeJson(row.team_members, []),
    financials: safeJson(row.financials, {}),
    linkedIn: row.linkedin || "",
    twitter: row.twitter || "",
    website: row.website || "",
    ipfsHash: row.ipfs_hash || "",
  };
}

function safeJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}
