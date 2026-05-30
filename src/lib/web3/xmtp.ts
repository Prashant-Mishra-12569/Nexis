/**
 * XMTP Browser SDK v7 — Nexis Chat Integration
 *
 * Architecture:
 * 1. Encryption key stored in Supabase (xmtp_keys table) per wallet address
 *    → Same key across ALL devices → Same XMTP database → All messages load
 * 2. localStorage used as fast cache to avoid Supabase call on every refresh
 * 3. createDmWithIdentifier() handles find-or-create at WASM level
 * 4. Read from ALL DMs with the peer (handles duplicates)
 * 5. streamAllMessages for real-time delivery across any DM
 */
import {
  Client,
  IdentifierKind,
  GroupMessageKind,
  SortDirection,
  type Signer as XMTPSigner,
} from "@xmtp/browser-sdk";
import { supabase } from "../supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
let xmtpClient: any = null;
let initPromise: Promise<any> | null = null;

// DM cache: peerAddress (lowercase) → WorkerConversation
const dmCache = new Map<string, any>();
const dmPending = new Map<string, Promise<any>>();

// Cache for peer inbox ID resolution
const inboxIdCache = new Map<string, string>();

export interface XMTPMessage {
  id: string;
  senderAddress: string;
  content: string;
  sent: Date;
  isFromMe: boolean;
}

function createXMTPSigner(
  walletAddress: string,
  signMessageFn: (message: string) => Promise<string>,
): XMTPSigner {
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: walletAddress.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    }),
    signMessage: async (message: string) => {
      const sig = await signMessageFn(message);
      const hex = sig.startsWith("0x") ? sig.slice(2) : sig;
      return Uint8Array.from(
        hex.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)),
      );
    },
  };
}

/** Convert Uint8Array to base64 string */
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Convert base64 string to Uint8Array */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get or create a persistent encryption key for the XMTP local database.
 *
 * Storage hierarchy:
 * 1. localStorage (fast cache, same device)
 * 2. Supabase xmtp_keys table (cross-device, persistent)
 * 3. Generate new key → store in both Supabase + localStorage
 *
 * Each wallet address gets ONE key that NEVER changes.
 */

/** Race a promise against a timeout — returns undefined on timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

async function getOrCreateEncryptionKey(walletAddress: string): Promise<Uint8Array> {
  const wallet = walletAddress.toLowerCase();
  const cacheKey = `nexis-xmtp-dbkey-${wallet}`;

  // 1. Fast path: check localStorage cache (instant, no network)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const bytes = base64ToBytes(cached);
      if (bytes.length === 32) {
        console.log("[XMTP] Using cached encryption key for", wallet.substring(0, 10));
        return bytes;
      }
    }
  } catch { /* localStorage unavailable */ }

  // 2. Check Supabase with 3s timeout (cross-device persistence)
  try {
    const result = await withTimeout(
      supabase
        .from("xmtp_keys")
        .select("db_encryption_key")
        .eq("wallet_address", wallet)
        .maybeSingle(),
      3000,
    );

    if (result && !result.error && result.data?.db_encryption_key) {
      const bytes = base64ToBytes(result.data.db_encryption_key);
      if (bytes.length === 32) {
        try { localStorage.setItem(cacheKey, result.data.db_encryption_key); } catch {}
        console.log("[XMTP] Loaded encryption key from Supabase for", wallet.substring(0, 10));
        return bytes;
      }
    }
  } catch (e) {
    console.warn("[XMTP] Supabase key lookup failed:", e);
  }

  // 3. Generate new key and persist to Supabase (fire-and-forget) + localStorage
  const key = crypto.getRandomValues(new Uint8Array(32));
  const base64Key = bytesToBase64(key);

  // Store in Supabase (non-blocking, don't wait)
  supabase.from("xmtp_keys").upsert(
    { wallet_address: wallet, db_encryption_key: base64Key },
    { onConflict: "wallet_address" },
  ).then(({ error }) => {
    if (error) console.warn("[XMTP] Failed to store key in Supabase:", error.message);
    else console.log("[XMTP] Key stored in Supabase for", wallet.substring(0, 10));
  }).catch(() => {});

  // Cache in localStorage (instant)
  try { localStorage.setItem(cacheKey, base64Key); } catch {}
  console.log("[XMTP] Generated new encryption key for", wallet.substring(0, 10));

  return key;
}

export async function initXMTP(
  walletAddress: string,
  signMessageFn: (message: string) => Promise<string>,
): Promise<any> {
  if (xmtpClient) return xmtpClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const signer = createXMTPSigner(walletAddress, signMessageFn);

      // Get persistent encryption key (Supabase → localStorage → generate)
      const encryptionKey = await getOrCreateEncryptionKey(walletAddress);

      const client = await Client.create(signer, {
        env: "dev",
        dbEncryptionKey: encryptionKey,
      } as any);
      xmtpClient = client;

      // Sync: pulls conversation list (incl. welcomes) + all messages
      try { await client.conversations.sync(); } catch { /* ok */ }
      try { await client.conversations.syncAll(); } catch { /* ok */ }

      console.log("[XMTP] Client ready. inboxId:", client.inboxId);
      return client;
    } catch (e) {
      initPromise = null;
      throw e;
    }
  })();

  return initPromise;
}

export function getXMTPClient(): any { return xmtpClient; }

export function disconnectXMTP(): void {
  xmtpClient = null;
  initPromise = null;
  dmCache.clear();
  dmPending.clear();
  inboxIdCache.clear();
}

export async function canMessageAddress(address: string): Promise<boolean> {
  if (!xmtpClient) return false;
  try {
    const result = await xmtpClient.canMessage([
      { identifier: address.toLowerCase(), identifierKind: IdentifierKind.Ethereum },
    ]);
    for (const [, value] of result.entries()) return value;
    return false;
  } catch (e) {
    console.error("[XMTP] canMessage error:", e);
    return false;
  }
}

function isDisplayableText(content: unknown): content is string {
  if (typeof content !== "string") return false;
  if (content.trim().length === 0) return false;
  if (content.startsWith('{"') || content.startsWith('[{') || content.startsWith('["')) return false;
  return true;
}

function toXMTPMessage(msg: any): XMTPMessage {
  return {
    id: msg.id ?? `msg-${Date.now()}-${Math.random()}`,
    senderAddress: msg.senderInboxId || "",
    content: typeof msg.content === "string" ? msg.content : String(msg.content ?? ""),
    sent: new Date(msg.sentAtNs ? Number(msg.sentAtNs) / 1_000_000 : Date.now()),
    isFromMe: msg.senderInboxId === xmtpClient?.inboxId,
  };
}

/**
 * Resolve wallet address to XMTP inbox ID (cached)
 */
async function resolveInboxId(address: string): Promise<string | null> {
  const key = address.toLowerCase();
  if (inboxIdCache.has(key)) return inboxIdCache.get(key)!;

  try {
    const id = await xmtpClient.fetchInboxIdByIdentifier({
      identifier: key,
      identifierKind: IdentifierKind.Ethereum,
    });
    if (id) {
      inboxIdCache.set(key, id);
      return id;
    }
  } catch { /* ok */ }
  return null;
}

/**
 * Find ALL DMs with a specific peer by scanning all DMs.
 * Returns valid DMs (with defined id) whose dmPeerInboxId matches.
 */
function findAllDmsWithPeer(peerInboxId: string): any[] {
  if (!xmtpClient) return [];
  try {
    const allDms = xmtpClient.conversations.listDms();
    const matching: any[] = [];
    for (const dm of allDms) {
      try {
        if (!dm.id) continue; // Skip broken DMs
        const peerId = dm.dmPeerInboxId();
        if (peerId === peerInboxId) {
          matching.push(dm);
        }
      } catch { /* skip */ }
    }
    return matching;
  } catch {
    return [];
  }
}

/**
 * Get or create a DM conversation.
 *
 * Strategy:
 * 1. Sync to pull any welcomes/new conversations from the network
 * 2. Always call createDmWithIdentifier — it handles find-or-create at WASM level
 * 3. Validate the returned DM has a defined id
 */
async function getOrCreateDm(peerAddress: string): Promise<any> {
  if (!xmtpClient) return null;
  const key = peerAddress.toLowerCase();

  if (dmCache.has(key)) return dmCache.get(key)!;
  if (dmPending.has(key)) return dmPending.get(key)!;

  const promise = (async () => {
    try {
      // Sync to pull welcomes (DMs created by the other party)
      try { await xmtpClient.conversations.sync(); } catch { /* ok */ }

      const peerIdentifier = { identifier: key, identifierKind: IdentifierKind.Ethereum };

      // createDmWithIdentifier handles find-or-create at the WASM level
      // It checks the local DB, and if no valid DM exists, creates one
      const dm = await xmtpClient.conversations.createDmWithIdentifier(peerIdentifier);

      if (dm && dm.id) {
        console.log("[XMTP] DM ready. convId:", dm.id, "peer:", key.substring(0, 10));
        dmCache.set(key, dm);
        return dm;
      }

      console.warn("[XMTP] createDmWithIdentifier returned invalid DM");
      return null;
    } catch (e) {
      console.error("[XMTP] getOrCreateDm error:", e);
      return null;
    } finally {
      dmPending.delete(key);
    }
  })();

  dmPending.set(key, promise);
  return promise;
}

/**
 * Send a text message
 */
export async function sendMessage(peerAddress: string, content: string): Promise<boolean> {
  const dm = await getOrCreateDm(peerAddress);
  if (!dm) return false;
  try {
    await dm.sendText(content);
    console.log("[XMTP] Sent:", content.substring(0, 50));
    return true;
  } catch (e) {
    console.error("[XMTP] sendMessage error:", e);
    return false;
  }
}

/**
 * Get ALL messages from ALL DMs with a peer.
 * This handles the duplicate DM problem by reading from every DM
 * associated with the peer, deduplicating by message ID.
 */
export async function getMessages(peerAddress: string): Promise<XMTPMessage[]> {
  if (!xmtpClient) return [];

  // Ensure we have a DM (creates one if needed, also syncs)
  const primaryDm = await getOrCreateDm(peerAddress);
  if (!primaryDm) return [];

  // Resolve peer inbox ID
  const peerInboxId = await resolveInboxId(peerAddress);
  if (!peerInboxId) return [];

  try {
    // Find ALL DMs with this peer (handles duplicates)
    const allDms = findAllDmsWithPeer(peerInboxId);
    // Also include the primary DM if not already in the list
    if (!allDms.find((d: any) => d.id === primaryDm.id)) {
      allDms.push(primaryDm);
    }

    console.log("[XMTP] Found", allDms.length, "DM(s) with peer");

    // Collect messages from ALL DMs
    const allMessages: XMTPMessage[] = [];
    const seenIds = new Set<string>();

    for (const dm of allDms) {
      try {
        await dm.sync();
        const raw = await dm.messages({
          kind: GroupMessageKind.Application,
          direction: SortDirection.Ascending,
        });

        for (const msg of raw) {
          if (!isDisplayableText(msg.content)) continue;
          const mapped = toXMTPMessage(msg);
          if (!seenIds.has(mapped.id)) {
            seenIds.add(mapped.id);
            allMessages.push(mapped);
          }
        }
      } catch (e) {
        console.warn("[XMTP] Error reading DM", dm.id, e);
      }
    }

    // Sort by time
    allMessages.sort((a, b) => a.sent.getTime() - b.sent.getTime());
    console.log("[XMTP] Total messages loaded:", allMessages.length);
    return allMessages;
  } catch (e) {
    console.error("[XMTP] getMessages error:", e);
    return [];
  }
}

/**
 * Explicitly sync all conversations and peer DMs before loading messages.
 * This is used for periodic background sync to pull new messages/DMs from the network.
 */
export async function syncAndGetMessages(peerAddress: string): Promise<XMTPMessage[]> {
  if (!xmtpClient) return [];
  try {
    // 1. Sync all conversations to pull down welcome messages and new DM threads
    await xmtpClient.conversations.sync();
  } catch (e) {
    console.warn("[XMTP] conversations.sync failed:", e);
  }
  // 2. Fetch all messages (internally runs getOrCreateDm and dm.sync())
  return getMessages(peerAddress);
}

/**
 * Stream messages in real-time using streamAllMessages.
 * This catches messages from ANY DM with the peer, regardless of
 * which DM the message was sent through.
 */
export async function streamMessages(
  peerAddress: string,
  callback: (message: XMTPMessage) => void,
): Promise<() => void> {
  if (!xmtpClient) return () => {};

  // Ensure DM exists
  await getOrCreateDm(peerAddress);

  // Resolve peer inbox ID for filtering
  const peerInboxId = await resolveInboxId(peerAddress);

  try {
    // Stream ALL messages across ALL conversations
    // Filter to only messages from/to this peer
    const closer = xmtpClient.conversations.streamAllMessages(
      (msg: any) => {
        // Only Application messages with displayable text
        if (msg.kind !== undefined && msg.kind !== GroupMessageKind.Application) return;
        if (!isDisplayableText(msg.content)) return;

        // Only messages from this peer or from us (in a DM with this peer)
        // We check senderInboxId: if it's from the peer or from us
        const fromPeer = msg.senderInboxId === peerInboxId;
        const fromMe = msg.senderInboxId === xmtpClient?.inboxId;

        if (fromPeer || fromMe) {
          console.log("[XMTP] Stream →", msg.content?.substring(0, 50), fromMe ? "(self)" : "(peer)");
          callback(toXMTPMessage(msg));
        }
      },
      () => { console.warn("[XMTP] Stream failed"); },
    );

    console.log("[XMTP] Global stream started, filtering for peer:", peerAddress.substring(0, 10));

    return () => {
      try { closer?.end?.(); } catch { /* ok */ }
    };
  } catch (e) {
    console.error("[XMTP] streamMessages error:", e);
    return () => {};
  }
}

/**
 * Stream all new conversations
 */
export async function streamConversations(
  callback: (peerAddress: string) => void,
): Promise<() => void> {
  if (!xmtpClient) return () => {};
  try {
    const closer = xmtpClient.conversations.stream(
      async (conversation: any) => {
        try {
          const members = await conversation.members();
          for (const m of members) {
            const identifiers = m.accountIdentifiers ?? [];
            for (const ident of identifiers) {
              if (ident.identifier.toLowerCase() !== xmtpClient?.accountIdentifier?.identifier?.toLowerCase()) {
                callback(ident.identifier);
              }
            }
          }
        } catch { /* ok */ }
      },
      () => { console.warn("[XMTP] Conversation stream failed"); },
    );
    return () => { try { closer?.end?.(); } catch { /* ok */ } };
  } catch { return () => {}; }
}
