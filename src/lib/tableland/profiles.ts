/**
 * Tableland Profile CRUD — replaces profileStore localStorage
 */
import { getReadOnlyDatabase, getDatabase } from "./client";
import { getTableNames } from "./config";
import type { JsonRpcSigner } from "ethers";

export type Role = "builder" | "investor";

export interface BuilderProfile {
  role: "builder";
  walletAddress: string;
  name: string;
  location: string;
  linkedin: string;
  twitter: string;
  github?: string;
  profilePicUrl: string | null;
  pitchVideoUrl: string | null;
  joinedAt: number;
  isVerified: boolean;
}

export interface InvestorProfile {
  role: "investor";
  walletAddress: string;
  name: string;
  firmName: string;
  thesis: string;
  ticketSize: string;
  industries: string[];
  linkedin: string;
  twitter: string;
  location?: string;
  profilePicUrl: string | null;
  joinedAt: number;
}

export type UserProfile = BuilderProfile | InvestorProfile;

/**
 * Get a profile by wallet address (read-only, free)
 */
export async function getProfile(walletAddress: string): Promise<UserProfile | null> {
  const tables = getTableNames();
  if (!tables) return null;

  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT * FROM ${tables.profiles} WHERE wallet = ?1;`)
      .bind(walletAddress.toLowerCase())
      .all();

    if (results.length === 0) return null;
    return rowToProfile(results[0]);
  } catch (e) {
    console.error("getProfile error:", e);
    return null;
  }
}

/**
 * Save / upsert a profile (on-chain write — costs gas)
 */
export async function saveProfile(
  signer: JsonRpcSigner,
  profile: UserProfile,
): Promise<UserProfile> {
  const tables = getTableNames();
  if (!tables) throw new Error("Tables not set up");

  const db = getDatabase(signer);
  const wallet = profile.walletAddress.toLowerCase();

  // Check if exists
  const existing = await getProfile(profile.walletAddress);

  if (existing) {
    // UPDATE — role is locked, cannot change
    const { meta } = await db
      .prepare(
        `UPDATE ${tables.profiles} SET
          name = ?1, location = ?2, linkedin = ?3, twitter = ?4,
          github = ?5, firm_name = ?6, thesis = ?7, ticket_size = ?8,
          industries = ?9, profile_pic_url = ?10, pitch_video_url = ?11,
          is_verified = ?12
        WHERE wallet = ?13;`,
      )
      .bind(
        profile.name,
        profile.location || "",
        profile.linkedin || "",
        profile.twitter || "",
        profile.role === "builder" ? profile.github || "" : "",
        profile.role === "investor" ? profile.firmName || "" : "",
        profile.role === "investor" ? profile.thesis || "" : "",
        profile.role === "investor" ? profile.ticketSize || "" : "",
        profile.role === "investor" ? JSON.stringify(profile.industries || []) : "[]",
        profile.profilePicUrl || "",
        profile.role === "builder" ? profile.pitchVideoUrl || "" : "",
        profile.role === "builder" && profile.isVerified ? 1 : 0,
      )
      .bind(wallet)
      .run();
    await meta.txn?.wait();
  } else {
    // INSERT
    const { meta } = await db
      .prepare(
        `INSERT INTO ${tables.profiles}
          (wallet, role, name, location, linkedin, twitter, github,
           firm_name, thesis, ticket_size, industries, profile_pic_url,
           pitch_video_url, is_verified, joined_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15);`,
      )
      .bind(
        wallet,
        profile.role,
        profile.name,
        profile.location || "",
        profile.linkedin || "",
        profile.twitter || "",
        profile.role === "builder" ? profile.github || "" : "",
        profile.role === "investor" ? profile.firmName || "" : "",
        profile.role === "investor" ? profile.thesis || "" : "",
        profile.role === "investor" ? profile.ticketSize || "" : "",
        profile.role === "investor" ? JSON.stringify(profile.industries || []) : "[]",
        profile.profilePicUrl || "",
        profile.role === "builder" ? profile.pitchVideoUrl || "" : "",
        profile.role === "builder" && profile.isVerified ? 1 : 0,
        Date.now(),
      )
      .run();
    await meta.txn?.wait();
  }

  return profile;
}

/**
 * Get all profiles (for search, discovery)
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  const tables = getTableNames();
  if (!tables) return [];
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db.prepare(`SELECT * FROM ${tables.profiles};`).all();
    return results.map(rowToProfile);
  } catch {
    return [];
  }
}

// Helper: convert Tableland row to UserProfile
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(row: any): UserProfile {
  const role = row.role as Role;
  if (role === "investor") {
    return {
      role: "investor",
      walletAddress: row.wallet,
      name: row.name || "",
      firmName: row.firm_name || "",
      thesis: row.thesis || "",
      ticketSize: row.ticket_size || "",
      industries: safeJsonParse(row.industries, []),
      linkedin: row.linkedin || "",
      twitter: row.twitter || "",
      location: row.location || "",
      profilePicUrl: row.profile_pic_url || null,
      joinedAt: row.joined_at || 0,
    };
  }
  return {
    role: "builder",
    walletAddress: row.wallet,
    name: row.name || "",
    location: row.location || "",
    linkedin: row.linkedin || "",
    twitter: row.twitter || "",
    github: row.github || "",
    profilePicUrl: row.profile_pic_url || null,
    pitchVideoUrl: row.pitch_video_url || null,
    joinedAt: row.joined_at || 0,
    isVerified: row.is_verified === 1,
  };
}

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export function getInitials(
  profile: UserProfile | null,
  fallback: string | null | undefined,
): string {
  if (profile?.name) {
    return (
      profile.name
        .replace("@", "")
        .split(/[\s.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "BR"
    );
  }
  if (fallback) return fallback.slice(2, 4).toUpperCase();
  return "BR";
}

export function shortAddress(addr: string | null | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
