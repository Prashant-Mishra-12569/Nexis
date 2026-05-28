/**
 * Tableland Swipes & Saved & Sentiment — replaces localStorage swipe/save/view tracking
 */
import { getReadOnlyDatabase, getDatabase } from "./client";
import { getTableNames } from "./config";
import type { JsonRpcSigner } from "ethers";

// ===== Swipes =====

export async function saveSwipe(
  signer: JsonRpcSigner,
  wallet: string,
  ideaId: string,
  liked: boolean,
): Promise<void> {
  const tables = getTableNames();
  if (!tables) return;
  const db = getDatabase(signer);
  const id = crypto.randomUUID();
  const { meta } = await db
    .prepare(
      `INSERT INTO ${tables.swipes} (id, wallet, idea_id, liked, ts) VALUES (?1, ?2, ?3, ?4, ?5);`,
    )
    .bind(id, wallet.toLowerCase(), ideaId, liked ? 1 : 0, Date.now())
    .run();
  await meta.txn?.wait();

  // Update sentiment
  await upsertSentiment(signer, ideaId, liked);
}

export async function getSwipedIdeaIds(wallet: string): Promise<{ liked: string[]; disliked: string[] }> {
  const tables = getTableNames();
  if (!tables) return { liked: [], disliked: [] };
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT idea_id, liked FROM ${tables.swipes} WHERE wallet = '${wallet.toLowerCase()}';`)
      .all();
    const liked: string[] = [];
    const disliked: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of results as any[]) {
      if (r.liked === 1) liked.push(r.idea_id);
      else disliked.push(r.idea_id);
    }
    return { liked, disliked };
  } catch {
    return { liked: [], disliked: [] };
  }
}

// ===== Saved Ideas =====

export async function toggleSavedIdea(
  signer: JsonRpcSigner,
  wallet: string,
  ideaId: string,
): Promise<boolean> {
  const tables = getTableNames();
  if (!tables) return false;
  const db = getDatabase(signer);
  const w = wallet.toLowerCase();

  // Check if already saved
  const rdb = getReadOnlyDatabase();
  const { results } = await rdb
    .prepare(`SELECT id FROM ${tables.saved} WHERE wallet = '${w}' AND idea_id = '${ideaId}';`)
    .all();

  if (results.length > 0) {
    // Unsave
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowId = (results[0] as any).id;
    const { meta } = await db
      .prepare(`DELETE FROM ${tables.saved} WHERE id = '${rowId}';`)
      .run();
    await meta.txn?.wait();
    return false;
  } else {
    // Save
    const id = crypto.randomUUID();
    const { meta } = await db
      .prepare(`INSERT INTO ${tables.saved} (id, wallet, idea_id, saved_at) VALUES (?1, ?2, ?3, ?4);`)
      .bind(id, w, ideaId, Date.now())
      .run();
    await meta.txn?.wait();
    return true;
  }
}

export async function isIdeaSaved(wallet: string, ideaId: string): Promise<boolean> {
  const tables = getTableNames();
  if (!tables) return false;
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT id FROM ${tables.saved} WHERE wallet = '${wallet.toLowerCase()}' AND idea_id = '${ideaId}';`)
      .all();
    return results.length > 0;
  } catch {
    return false;
  }
}

export async function getSavedIdeaIds(wallet: string): Promise<string[]> {
  const tables = getTableNames();
  if (!tables) return [];
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT idea_id FROM ${tables.saved} WHERE wallet = '${wallet.toLowerCase()}' ORDER BY saved_at DESC;`)
      .all();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.map((r: any) => r.idea_id as string);
  } catch {
    return [];
  }
}

// ===== Sentiment (views, likes, dislikes) =====

export interface IdeaSentiment {
  likes: number;
  dislikes: number;
  views: number;
}

async function upsertSentiment(
  signer: JsonRpcSigner,
  ideaId: string,
  liked: boolean,
): Promise<void> {
  const tables = getTableNames();
  if (!tables) return;
  const db = getDatabase(signer);

  // Try update first
  const rdb = getReadOnlyDatabase();
  const { results } = await rdb
    .prepare(`SELECT * FROM ${tables.sentiment} WHERE idea_id = '${ideaId}';`)
    .all();

  if (results.length > 0) {
    const field = liked ? "likes" : "dislikes";
    const { meta } = await db
      .prepare(`UPDATE ${tables.sentiment} SET ${field} = ${field} + 1 WHERE idea_id = '${ideaId}';`)
      .run();
    await meta.txn?.wait();
  } else {
    const { meta } = await db
      .prepare(
        `INSERT INTO ${tables.sentiment} (idea_id, likes, dislikes, views) VALUES (?1, ?2, ?3, ?4);`,
      )
      .bind(ideaId, liked ? 1 : 0, liked ? 0 : 1, 0)
      .run();
    await meta.txn?.wait();
  }
}

export async function incrementIdeaView(
  signer: JsonRpcSigner,
  ideaId: string,
): Promise<void> {
  const tables = getTableNames();
  if (!tables) return;
  const db = getDatabase(signer);

  const rdb = getReadOnlyDatabase();
  const { results } = await rdb
    .prepare(`SELECT * FROM ${tables.sentiment} WHERE idea_id = '${ideaId}';`)
    .all();

  if (results.length > 0) {
    const { meta } = await db
      .prepare(`UPDATE ${tables.sentiment} SET views = views + 1 WHERE idea_id = '${ideaId}';`)
      .run();
    await meta.txn?.wait();
  } else {
    const { meta } = await db
      .prepare(
        `INSERT INTO ${tables.sentiment} (idea_id, likes, dislikes, views) VALUES (?1, 0, 0, 1);`,
      )
      .bind(ideaId)
      .run();
    await meta.txn?.wait();
  }
}

export async function getIdeaSentiment(ideaId: string): Promise<IdeaSentiment> {
  const tables = getTableNames();
  if (!tables) return { likes: 0, dislikes: 0, views: 0 };
  try {
    const db = getReadOnlyDatabase();
    const { results } = await db
      .prepare(`SELECT * FROM ${tables.sentiment} WHERE idea_id = '${ideaId}';`)
      .all();
    if (results.length === 0) return { likes: 0, dislikes: 0, views: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = results[0] as any;
    return { likes: r.likes || 0, dislikes: r.dislikes || 0, views: r.views || 0 };
  } catch {
    return { likes: 0, dislikes: 0, views: 0 };
  }
}

export async function getReceivedRightSwipes(walletAddress: string, ideaIds: string[]): Promise<number> {
  if (ideaIds.length === 0) return 0;
  let total = 0;
  for (const id of ideaIds) {
    const s = await getIdeaSentiment(id);
    total += s.likes;
  }
  return total;
}

export async function getOwnerTotalViews(ideaIds: string[]): Promise<number> {
  let total = 0;
  for (const id of ideaIds) {
    const s = await getIdeaSentiment(id);
    total += s.views;
  }
  return total;
}
