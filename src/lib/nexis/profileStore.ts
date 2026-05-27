/**
 * Profile Store - Per-wallet user profile (builder or investor)
 * Persisted in localStorage and keyed by wallet address.
 */

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
  isVerified: boolean; // set after on-chain onboarding tx confirms
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

const PROFILES_KEY = "nexis_profiles";

function readAll(): Record<string, UserProfile> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(PROFILES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, UserProfile>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(map));
}

export function getProfile(walletAddress: string | null | undefined): UserProfile | null {
  if (!walletAddress) return null;
  const all = readAll();
  return all[walletAddress.toLowerCase()] ?? null;
}

export function saveProfile(profile: UserProfile): UserProfile {
  const all = readAll();
  all[profile.walletAddress.toLowerCase()] = profile;
  writeAll(all);
  return profile;
}

export function updateProfile(
  walletAddress: string,
  patch: Partial<UserProfile>,
): UserProfile | null {
  const all = readAll();
  const key = walletAddress.toLowerCase();
  const current = all[key];
  if (!current) return null;
  const merged = { ...current, ...patch } as UserProfile;
  all[key] = merged;
  writeAll(all);
  return merged;
}

export function deleteProfile(walletAddress: string): void {
  const all = readAll();
  delete all[walletAddress.toLowerCase()];
  writeAll(all);
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
