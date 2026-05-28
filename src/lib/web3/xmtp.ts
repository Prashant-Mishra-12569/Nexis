/**
 * XMTP Browser SDK v7 Integration for Nexis
 * E2E encrypted cross-device messaging
 */
import {
  Client,
  IdentifierKind,
  type Signer as XMTPSigner,
  type Dm,
} from "@xmtp/browser-sdk";

let xmtpClient: Client | null = null;

export interface XMTPMessage {
  id: string;
  senderAddress: string;
  content: string;
  sent: Date;
  isFromMe: boolean;
}

/**
 * Create an XMTP-compatible signer from Privy/viem wallet
 */
function createXMTPSigner(
  walletAddress: string,
  signMessageFn: (message: string) => Promise<string>,
): XMTPSigner {
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: walletAddress,
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

/**
 * Initialize XMTP client with a wallet
 */
export async function initXMTP(
  walletAddress: string,
  signMessageFn: (message: string) => Promise<string>,
): Promise<Client> {
  if (xmtpClient) return xmtpClient;

  const signer = createXMTPSigner(walletAddress, signMessageFn);
  xmtpClient = await Client.create(signer, {
    env: "production",
  });

  console.log("XMTP client initialized for:", walletAddress);
  return xmtpClient;
}

/**
 * Get existing XMTP client
 */
export function getXMTPClient(): Client | null {
  return xmtpClient;
}

/**
 * Disconnect XMTP client
 */
export function disconnectXMTP(): void {
  xmtpClient = null;
}

/**
 * Check if an address can receive XMTP messages
 */
export async function canMessageAddress(address: string): Promise<boolean> {
  if (!xmtpClient) return false;
  try {
    const result = await Client.canMessage([
      { identifier: address, identifierKind: IdentifierKind.Ethereum },
    ]);
    return result.get(address) ?? false;
  } catch (e) {
    console.error("canMessage error:", e);
    return false;
  }
}

/**
 * Get or create a DM conversation with a peer
 */
async function getOrCreateDm(peerAddress: string): Promise<Dm | null> {
  if (!xmtpClient) return null;

  try {
    // First check existing conversations
    const conversations = await xmtpClient.conversations.list();
    for (const conv of conversations) {
      if (conv.peerInboxId) {
        // Check if this conversation involves the peer address
        const members = await conv.members;
        const hasPeer = members.some(
          (m: { addresses: string[] }) =>
            m.addresses.some(
              (a: string) => a.toLowerCase() === peerAddress.toLowerCase(),
            ),
        );
        if (hasPeer) return conv as Dm;
      }
    }

    // Create new DM
    const dm = await xmtpClient.conversations.createDm({
      identifier: peerAddress,
      identifierKind: IdentifierKind.Ethereum,
    });
    return dm;
  } catch (e) {
    console.error("getOrCreateDm error:", e);
    return null;
  }
}

/**
 * Send a text message to a peer
 */
export async function sendMessage(
  peerAddress: string,
  content: string,
): Promise<boolean> {
  const dm = await getOrCreateDm(peerAddress);
  if (!dm) return false;

  try {
    await dm.sendText(content);
    return true;
  } catch (e) {
    console.error("sendMessage error:", e);
    return false;
  }
}

/**
 * Get all messages from a conversation with a peer
 */
export async function getMessages(peerAddress: string): Promise<XMTPMessage[]> {
  if (!xmtpClient) return [];

  const dm = await getOrCreateDm(peerAddress);
  if (!dm) return [];

  try {
    const messages = await dm.messages();
    return messages.map((msg) => ({
      id: msg.id,
      senderAddress: msg.senderInboxId || "",
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      sent: new Date(msg.sentAtNs ? Number(msg.sentAtNs) / 1e6 : Date.now()),
      isFromMe: msg.senderInboxId === xmtpClient?.inboxId,
    }));
  } catch (e) {
    console.error("getMessages error:", e);
    return [];
  }
}

/**
 * Stream messages from a conversation in real-time
 */
export async function streamMessages(
  peerAddress: string,
  callback: (message: XMTPMessage) => void,
): Promise<() => void> {
  const dm = await getOrCreateDm(peerAddress);
  if (!dm) return () => {};

  try {
    const stream = await dm.stream();
    const abortController = new AbortController();

    (async () => {
      try {
        for await (const message of stream) {
          if (abortController.signal.aborted) break;
          callback({
            id: message.id,
            senderAddress: message.senderInboxId || "",
            content:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
            sent: new Date(
              message.sentAtNs ? Number(message.sentAtNs) / 1e6 : Date.now(),
            ),
            isFromMe: message.senderInboxId === xmtpClient?.inboxId,
          });
        }
      } catch {
        // Stream ended
      }
    })();

    return () => {
      abortController.abort();
    };
  } catch {
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
    const stream = await xmtpClient.conversations.stream();
    const abortController = new AbortController();

    (async () => {
      try {
        for await (const conversation of stream) {
          if (abortController.signal.aborted) break;
          const members = await conversation.members;
          for (const m of members) {
            for (const addr of m.addresses) {
              if (addr.toLowerCase() !== xmtpClient?.accountAddress?.toLowerCase()) {
                callback(addr);
              }
            }
          }
        }
      } catch {
        // Stream ended
      }
    })();

    return () => abortController.abort();
  } catch {
    return () => {};
  }
}
