/**
 * Tableland Client — bridges wagmi/viem wallet to ethers signer for Tableland SDK
 */
import { Database, Registry } from "@tableland/sdk";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Account, Chain, Client, Transport } from "viem";

/**
 * Convert a viem WalletClient to an ethers v6 JsonRpcSigner
 * Required because @tableland/sdk uses ethers internally
 */
export function walletClientToSigner(
  client: Client<Transport, Chain, Account>,
): JsonRpcSigner {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain!.id,
    name: chain!.name,
    ensAddress: (chain!.contracts as Record<string, { address: string }>)?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  return new JsonRpcSigner(provider, account!.address);
}

/**
 * Get a Tableland Database instance with signer (for writes)
 */
export function getDatabase(signer: JsonRpcSigner): Database {
  return new Database({ signer });
}

/**
 * Get a read-only Tableland Database (no signer needed)
 */
export function getReadOnlyDatabase(): Database {
  return new Database();
}

/**
 * Get a Tableland Registry instance (for setting controllers)
 */
export function getRegistry(signer: JsonRpcSigner): Registry {
  return new Registry({ signer });
}
