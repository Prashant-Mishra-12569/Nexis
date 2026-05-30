/**
 * Matches CRUD — migrated from Tableland to Supabase
 */
import { supabase } from "../supabase/client";
import type { JsonRpcSigner } from "ethers";

export type MatchStatus = "pending" | "accepted" | "declined";
export type DealStatus = "none" | "requested" | "confirmed" | "rejected";

export interface Match {
  id: string;
  ideaId: string;
  ideaName: string;
  industry?: string;
  builderName: string;
  builderAvatar: string;
  builderWallet: string;
  investorWallet: string;
  investorAvatar?: string;
  matchedAt: Date;
  lastMessage?: string;
  unread: boolean;
  status: MatchStatus;
  dealStatus?: DealStatus;
  dealId?: `0x${string}`;
  dealTokenURI?: string;
  dealTokenId?: number;
}

/**
 * Create a match
 */
export async function createMatch(
  signer: JsonRpcSigner | undefined,
  data: {
    ideaId: string;
    ideaName: string;
    industry?: string;
    builderName: string;
    builderAvatar: string;
    builderWallet: string;
    investorWallet: string;
    investorAvatar?: string;
  },
): Promise<Match> {
  const id = crypto.randomUUID();
  const now = Date.now();

  const payload = {
    id,
    idea_id: data.ideaId,
    idea_name: data.ideaName,
    industry: data.industry || "",
    builder_name: data.builderName,
    builder_avatar: data.builderAvatar,
    builder_wallet: data.builderWallet.toLowerCase(),
    investor_wallet: data.investorWallet.toLowerCase(),
    investor_avatar: data.investorAvatar || "",
    matched_at: now,
    last_message: "New interest from investor.",
    unread: true,
    status: "pending",
    deal_status: "none",
  };

  const { error } = await supabase
    .from("matches")
    .insert(payload);

  if (error) {
    console.error("createMatch error:", error);
    throw error;
  }

  return {
    ...data,
    id,
    matchedAt: new Date(now),
    lastMessage: "New interest from investor.",
    unread: true,
    status: "pending",
    dealStatus: "none",
  };
}

/**
 * Get matches for a wallet (builder or investor side)
 */
export async function getMatchesForWallet(
  walletAddress: string,
  role?: "builder" | "investor",
): Promise<Match[]> {
  if (!walletAddress) return [];
  try {
    const w = walletAddress.toLowerCase();
    let query = supabase.from("matches").select("*");

    if (role === "builder") {
      query = query.eq("builder_wallet", w);
    } else if (role === "investor") {
      query = query.eq("investor_wallet", w);
    } else {
      query = query.or(`builder_wallet.eq.${w},investor_wallet.eq.${w}`);
    }

    const { data, error } = await query.order("matched_at", { ascending: false });

    if (error) {
      console.error("getMatchesForWallet error:", error);
      return [];
    }

    return (data || []).map(rowToMatch);
  } catch (e) {
    console.error("getMatchesForWallet error:", e);
    return [];
  }
}

/**
 * Check if a match already exists
 */
export async function matchExists(
  ideaId: string,
  investorWallet: string,
): Promise<boolean> {
  if (!ideaId || !investorWallet) return false;
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("investor_wallet", investorWallet.toLowerCase());

    if (error) {
      console.error("matchExists error:", error);
      return false;
    }

    return (data || []).length > 0;
  } catch {
    return false;
  }
}

/**
 * Update a match field
 */
export async function updateMatch(
  signer: JsonRpcSigner | undefined,
  matchId: string,
  patch: Partial<Pick<Match, "status" | "dealStatus" | "dealId" | "dealTokenURI" | "dealTokenId" | "lastMessage" | "unread">>,
): Promise<void> {
  if (!matchId) return;

  const payload: any = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.dealStatus !== undefined) payload.deal_status = patch.dealStatus;
  if (patch.dealId !== undefined) payload.deal_id = patch.dealId;
  if (patch.dealTokenURI !== undefined) payload.deal_token_uri = patch.dealTokenURI;
  if (patch.dealTokenId !== undefined) payload.deal_token_id = patch.dealTokenId;
  if (patch.lastMessage !== undefined) payload.last_message = patch.lastMessage;
  if (patch.unread !== undefined) payload.unread = !!patch.unread;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from("matches")
    .update(payload)
    .eq("id", matchId);

  if (error) {
    console.error("updateMatch error:", error);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMatch(row: any): Match {
  return {
    id: row.id,
    ideaId: row.idea_id,
    ideaName: row.idea_name || "",
    industry: row.industry || "",
    builderName: row.builder_name || "",
    builderAvatar: row.builder_avatar || "",
    builderWallet: row.builder_wallet || "",
    investorWallet: row.investor_wallet || "",
    investorAvatar: row.investor_avatar || "",
    matchedAt: new Date(Number(row.matched_at || 0)),
    lastMessage: row.last_message || "",
    unread: !!row.unread,
    status: (row.status || "pending") as MatchStatus,
    dealStatus: (row.deal_status || "none") as DealStatus,
    dealId: row.deal_id || undefined,
    dealTokenURI: row.deal_token_uri || undefined,
    dealTokenId: row.deal_token_id || undefined,
  };
}
