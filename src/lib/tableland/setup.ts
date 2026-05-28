/**
 * Tableland Setup — creates all tables and deploys AllowAll controller
 * Run once by the dApp admin/deployer.
 */
import type { JsonRpcSigner } from "ethers";
import { getDatabase, getRegistry } from "./client";
import {
  setTableNames,
  setControllerAddress,
  type TableNames,
} from "./config";

export interface SetupResult {
  tables: TableNames;
  controllerAddress: string;
}

export interface SetupProgress {
  step: string;
  detail: string;
  current: number;
  total: number;
}

/**
 * Create all Tableland tables for Nexis.
 * Each CREATE TABLE is an on-chain transaction.
 */
export async function createAllTables(
  signer: JsonRpcSigner,
  onProgress?: (p: SetupProgress) => void,
): Promise<TableNames> {
  const db = getDatabase(signer);
  const total = 6;
  let current = 0;

  const report = (step: string, detail: string) => {
    current++;
    onProgress?.({ step, detail, current, total });
  };

  // 1. Profiles
  report("profiles", "Creating profiles table…");
  const { meta: pMeta } = await db
    .prepare(
      `CREATE TABLE nexis_profiles (
        wallet TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        name TEXT,
        location TEXT,
        linkedin TEXT,
        twitter TEXT,
        github TEXT,
        firm_name TEXT,
        thesis TEXT,
        ticket_size TEXT,
        industries TEXT,
        profile_pic_url TEXT,
        pitch_video_url TEXT,
        is_verified INTEGER DEFAULT 0,
        joined_at INTEGER
      );`,
    )
    .run();
  await pMeta.txn?.wait();
  const profilesTable = pMeta.txn?.names?.[0] ?? "";

  // 2. Ideas
  report("ideas", "Creating ideas table…");
  const { meta: iMeta } = await db
    .prepare(
      `CREATE TABLE nexis_ideas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tagline TEXT,
        description TEXT,
        industry TEXT,
        stage TEXT,
        ask TEXT,
        equity TEXT,
        image TEXT,
        founder TEXT,
        founder_avatar TEXT,
        wallet_address TEXT NOT NULL,
        match_score INTEGER DEFAULT 80,
        created_at INTEGER,
        pitch_deck_url TEXT,
        pitch_video_url TEXT,
        team_members TEXT,
        financials TEXT,
        linkedin TEXT,
        twitter TEXT,
        website TEXT,
        ipfs_hash TEXT
      );`,
    )
    .run();
  await iMeta.txn?.wait();
  const ideasTable = iMeta.txn?.names?.[0] ?? "";

  // 3. Matches
  report("matches", "Creating matches table…");
  const { meta: mMeta } = await db
    .prepare(
      `CREATE TABLE nexis_matches (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL,
        idea_name TEXT,
        industry TEXT,
        builder_name TEXT,
        builder_avatar TEXT,
        builder_wallet TEXT NOT NULL,
        investor_wallet TEXT NOT NULL,
        investor_avatar TEXT,
        matched_at INTEGER,
        last_message TEXT,
        unread INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending',
        deal_status TEXT DEFAULT 'none',
        deal_id TEXT,
        deal_token_uri TEXT,
        deal_token_id INTEGER
      );`,
    )
    .run();
  await mMeta.txn?.wait();
  const matchesTable = mMeta.txn?.names?.[0] ?? "";

  // 4. Swipes
  report("swipes", "Creating swipes table…");
  const { meta: sMeta } = await db
    .prepare(
      `CREATE TABLE nexis_swipes (
        id TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        idea_id TEXT NOT NULL,
        liked INTEGER NOT NULL,
        ts INTEGER
      );`,
    )
    .run();
  await sMeta.txn?.wait();
  const swipesTable = sMeta.txn?.names?.[0] ?? "";

  // 5. Saved ideas
  report("saved", "Creating saved ideas table…");
  const { meta: svMeta } = await db
    .prepare(
      `CREATE TABLE nexis_saved (
        id TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        idea_id TEXT NOT NULL,
        saved_at INTEGER
      );`,
    )
    .run();
  await svMeta.txn?.wait();
  const savedTable = svMeta.txn?.names?.[0] ?? "";

  // 6. Sentiment (views / likes / dislikes per idea)
  report("sentiment", "Creating sentiment table…");
  const { meta: snMeta } = await db
    .prepare(
      `CREATE TABLE nexis_sentiment (
        idea_id TEXT PRIMARY KEY,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0
      );`,
    )
    .run();
  await snMeta.txn?.wait();
  const sentimentTable = snMeta.txn?.names?.[0] ?? "";

  const tables: TableNames = {
    profiles: profilesTable,
    ideas: ideasTable,
    matches: matchesTable,
    swipes: swipesTable,
    saved: savedTable,
    sentiment: sentimentTable,
  };

  setTableNames(tables);
  return tables;
}

/**
 * Set the AllowAll controller on all tables so any wallet can write.
 */
export async function setControllerOnTables(
  signer: JsonRpcSigner,
  tables: TableNames,
  controllerAddress: string,
  onProgress?: (p: SetupProgress) => void,
): Promise<void> {
  const registry = getRegistry(signer);
  const tableList = Object.entries(tables);
  let current = 0;
  const total = tableList.length;

  for (const [key, tableName] of tableList) {
    current++;
    onProgress?.({
      step: `controller-${key}`,
      detail: `Setting controller on ${key} table…`,
      current,
      total,
    });
    const tx = await registry.setController({ tableName, controller: controllerAddress });
    await tx.wait();
  }

  setControllerAddress(controllerAddress);
}
