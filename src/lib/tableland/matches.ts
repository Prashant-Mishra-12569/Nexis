/**
 * Tableland Matches CRUD — replaces localStorage match management
 */
import { getReadOnlyDatabase, getDatabase } from "./client";
import { getTableNames } from "./config";
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
 * Create a match (investor swiped right)
 */
export async function createMatch(
  signer: JsonRpcSigner,
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
  const tables = getTableNames();
  if (!tables) throw new Error("Tables not set up");

  const db = getDatabase(signer);
  const id = crypto.randomUUID();
  const now = Date.now();

  const { meta } = await db
    .prepare(
      `INSERT INTO ${tables.matches}
        (id, idea_id, idea_name, industry, builder_name, builder_avatar,
         builder_wallet, investor_wallet, investor_avatar, matched_at,
         last_message, unread, status, deal_status)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14);`,
    )
    .bind(
      id,
      data.ideaId,
      data.ideaName,
      data.industry || "",
      data.builderName,
      data.builderAvatar,
      data.builderWallet.toLowerCase(),
      data.investorWallet.toLowerCase(),
      data.investorAvatar || "",
      now,
      "New interest from investor.",
      1,
      "pending",
      "none",
    )
    .run();
  await meta.txn?.wait();

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
  const tables = getTableNames();
  if (!tables) return [];
  try {
    const db = getReadOnlyDatabase();
    const w = walletAddress.toLowerCase();
    let sql: string;
    if (role === "builder") {
      sql = `SELECT * FROM ${tables.matches} WHERE builder_wallet = '${w}' ORDER BY matched_at DESC;`;
    } else if (role === "investor") {
      sql = `SELECT * FROM ${tables.matches} WHERE investor_wallet = '${w}' ORDER BY matched_at DESC;`;
    } else {
      sql = `SELECT * FROM ${tables.matches} WHERE builder_wallet = '${w}' OR investor_wallet = '${w}' ORDER BY matched_at DESC;`;
    }
    const { results } = await db.prepare(sql).all();
    return results.map(rowToMatch);
  } catch (e) {
    console.error("getMatchesForWallet error:", e);
    return [];
  }
}

/**
 * Check if a match already exists (prevent duplicates)
 */
export async function matchExists(
  ideaId: string,
  investorWallet: string,
): Promise<boolean> {
  const tables = getTableNames();
  if (!tables) return false;
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(
        `SELECT id FROM ${tables.matches} WHERE idea_id = '${ideaId}' AND investor_wallet = '${investorWallet.toLowerCase()}';`,
      )
      .all();
    return results.length > 0;
  } catch {
    return false;
  }
}

/**
 * Update a match field (on-chain write)
 */
export async function updateMatch(
  signer: JsonRpcSigner,
  matchId: string,
  patch: Partial<Pick<Match, "status" | "dealStatus" | "dealId" | "dealTokenURI" | "dealTokenId" | "lastMessage" | "unread">>,
): Promise<void> {
  const tables = getTableNames();
  if (!tables) return;

  const db = getDatabase(signer);
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  let idx = 1;

  if (patch.status !== undefined) { sets.push(`status = ?${idx}`); vals.push(patch.status); idx++; }
  if (patch.dealStatus !== undefined) { sets.push(`deal_status = ?${idx}`); vals.push(patch.dealStatus); idx++; }
  if (patch.dealId !== undefined) { sets.push(`deal_id = ?${idx}`); vals.push(patch.dealId); idx++; }
  if (patch.dealTokenURI !== undefined) { sets.push(`deal_token_uri = ?${idx}`); vals.push(patch.dealTokenURI); idx++; }
  if (patch.dealTokenId !== undefined) { sets.push(`deal_token_id = ?${idx}`); vals.push(patch.dealTokenId); idx++; }
  if (patch.lastMessage !== undefined) { sets.push(`last_message = ?${idx}`); vals.push(patch.lastMessage); idx++; }
  if (patch.unread !== undefined) { sets.push(`unread = ?${idx}`); vals.push(patch.unread ? 1 : 0); idx++; }

  if (sets.length === 0) return;

  vals.push(matchId);
  const sql = `UPDATE ${tables.matches} SET ${sets.join(", ")} WHERE id = ?${idx};`;
  const stmt = db.prepare(sql);
  const bound = stmt.bind(...vals);
  const { meta } = await bound.run();
  await meta.txn?.wait();
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
    matchedAt: new Date(row.matched_at || 0),
    lastMessage: row.last_message || "",
    unread: row.unread === 1,
    status: (row.status || "pending") as MatchStatus,
    dealStatus: (row.deal_status || "none") as DealStatus,
    dealId: row.deal_id || undefined,
    dealTokenURI: row.deal_token_uri || undefined,
    dealTokenId: row.deal_token_id || undefined,
  };
}
