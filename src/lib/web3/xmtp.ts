import { Client, type Conversation, type DecodedMessage } from "@xmtp/xmtp-js";

// Use a structural Signer type (compatible with ethers and viem-wrapped signers)
type Signer = {
  getAddress(): Promise<string>;
  signMessage(message: string | Uint8Array): Promise<string>;
};

let xmtpClient: Client | null = null;

export interface XMTPMessage {
  id: string;
  senderAddress: string;
  content: string;
  sent: Date;
  isFromMe: boolean;
}

export interface XMTPConversation {
  peerAddress: string;
  topic: string;
  createdAt: Date;
  context?: {
    conversationId: string;
    metadata: Record<string, string>;
  };
}

/**
 * Initialize XMTP client with a signer
 */
export async function initXMTP(signer: Signer): Promise<Client> {
  if (xmtpClient) {
    return xmtpClient;
  }

  try {
    xmtpClient = await Client.create(signer, {
      env: "production", // Use 'dev' for testing
    });
    console.log("XMTP client initialized for:", xmtpClient.address);
    return xmtpClient;
  } catch (error) {
    console.error("Failed to initialize XMTP:", error);
    throw error;
  }
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
export async function canMessage(address: string): Promise<boolean> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  try {
    return await xmtpClient.canMessage(address);
  } catch (error) {
    console.error("Error checking if can message:", error);
    return false;
  }
}

/**
 * Start a new conversation with context (for Nexis matching)
 */
export async function startConversation(
  peerAddress: string,
  ideaName: string,
  matchType: "investor_interest" | "builder_accept",
): Promise<Conversation> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  const conversation = await xmtpClient.conversations.newConversation(peerAddress, {
    conversationId: `nexis-${ideaName}-${Date.now()}`,
    metadata: {
      app: "nexis",
      ideaName,
      matchType,
      timestamp: new Date().toISOString(),
    },
  });

  return conversation;
}

/**
 * Send an automated match message
 */
export async function sendMatchMessage(
  peerAddress: string,
  ideaName: string,
  senderType: "investor" | "builder",
): Promise<void> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  const conversation = await startConversation(
    peerAddress,
    ideaName,
    senderType === "investor" ? "investor_interest" : "builder_accept",
  );

  const message =
    senderType === "investor"
      ? `👋 I'm interested in "${ideaName}". I'd love to learn more about your vision and how we can work together.`
      : `✅ Thanks for your interest in "${ideaName}"! I'd be happy to discuss further. What would you like to know?`;

  await conversation.send(message);
}

/**
 * Get all conversations
 */
export async function getAllConversations(): Promise<XMTPConversation[]> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  const conversations = await xmtpClient.conversations.list();

  return conversations.map((conv) => ({
    peerAddress: conv.peerAddress,
    topic: conv.topic,
    createdAt: conv.createdAt,
    context: conv.context,
  }));
}

/**
 * Get messages from a conversation
 */
export async function getMessages(peerAddress: string): Promise<XMTPMessage[]> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  const conversations = await xmtpClient.conversations.list();
  const conversation = conversations.find((c) => c.peerAddress === peerAddress);

  if (!conversation) {
    return [];
  }

  const messages = await conversation.messages();

  return messages.map((msg) => ({
    id: msg.id,
    senderAddress: msg.senderAddress,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    sent: msg.sent,
    isFromMe: msg.senderAddress === xmtpClient?.address,
  }));
}

/**
 * Send a message to a peer
 */
export async function sendMessage(peerAddress: string, content: string): Promise<void> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  const conversations = await xmtpClient.conversations.list();
  let conversation = conversations.find((c) => c.peerAddress === peerAddress);

  if (!conversation) {
    conversation = await xmtpClient.conversations.newConversation(peerAddress);
  }

  await conversation.send(content);
}

/**
 * Stream messages from a conversation
 */
export async function streamMessages(
  peerAddress: string,
  callback: (message: XMTPMessage) => void,
): Promise<() => void> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  const conversations = await xmtpClient.conversations.list();
  const conversation = conversations.find((c) => c.peerAddress === peerAddress);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const stream = await conversation.streamMessages();

  (async () => {
    for await (const message of stream) {
      callback({
        id: message.id,
        senderAddress: message.senderAddress,
        content:
          typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        sent: message.sent,
        isFromMe: message.senderAddress === xmtpClient?.address,
      });
    }
  })();

  return () => {
    void stream.return();
  };
}

/**
 * Stream all new conversations
 */
export async function streamConversations(
  callback: (conversation: XMTPConversation) => void,
): Promise<() => void> {
  if (!xmtpClient) {
    throw new Error("XMTP client not initialized");
  }

  const stream = await xmtpClient.conversations.stream();

  (async () => {
    for await (const conversation of stream) {
      callback({
        peerAddress: conversation.peerAddress,
        topic: conversation.topic,
        createdAt: conversation.createdAt,
        context: conversation.context,
      });
    }
  })();

  return () => {
    void stream.return();
  };
}
