/**
 * Profiles CRUD — migrated from Tableland to Supabase
 */
import { supabase } from "../supabase/client";
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
 * Get a profile by wallet address
 */
export async function getProfile(walletAddress: string): Promise<UserProfile | null> {
  if (!walletAddress) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet", walletAddress.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("getProfile error:", error);
      return null;
    }
    if (!data) return null;
    return rowToProfile(data);
  } catch (e) {
    console.error("getProfile unexpected error:", e);
    return null;
  }
}

/**
 * Save / upsert a profile
 */
export async function saveProfile(
  signer: JsonRpcSigner | undefined,
  profile: UserProfile,
): Promise<UserProfile> {
  const wallet = profile.walletAddress.toLowerCase();

  const payload: any = {
    wallet,
    role: profile.role,
    name: profile.name,
    location: profile.location || "",
    linkedin: profile.linkedin || "",
    twitter: profile.twitter || "",
    profile_pic_url: profile.profilePicUrl || "",
    is_verified: profile.role === "builder" && profile.isVerified,
  };

  if (profile.role === "builder") {
    payload.github = profile.github || "";
    payload.pitch_video_url = profile.pitchVideoUrl || "";
  } else if (profile.role === "investor") {
    payload.firm_name = profile.firmName || "";
    payload.thesis = profile.thesis || "";
    payload.ticket_size = profile.ticketSize || "";
    payload.industries = profile.industries || [];
  }

  // Check if exists
  const existing = await getProfile(profile.walletAddress);

  if (existing) {
    // UPDATE
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("wallet", wallet);
    if (error) {
      console.error("saveProfile UPDATE error:", error);
      throw error;
    }
  } else {
    // INSERT
    payload.joined_at = Date.now();
    const { error } = await supabase
      .from("profiles")
      .insert(payload);
    if (error) {
      console.error("saveProfile INSERT error:", error);
      throw error;
    }
  }

  return profile;
}

/**
 * Get all profiles (for search, discovery)
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*");
    if (error) {
      console.error("getAllProfiles error:", error);
      return [];
    }
    return (data || []).map(rowToProfile);
  } catch {
    return [];
  }
}

// Helper: convert row to UserProfile
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
      industries: Array.isArray(row.industries) ? row.industries : [],
      linkedin: row.linkedin || "",
      twitter: row.twitter || "",
      location: row.location || "",
      profilePicUrl: row.profile_pic_url || null,
      joinedAt: Number(row.joined_at || 0),
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
    joinedAt: Number(row.joined_at || 0),
    isVerified: !!row.is_verified,
  };
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
