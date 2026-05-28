/**
 * useTablelandSigner — React hook that bridges wagmi/viem wallet to Tableland SDK
 */
import { useMemo } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useConnectorClient } from "wagmi";

export function useTablelandSigner(): JsonRpcSigner | undefined {
  const { data: client } = useConnectorClient();

  return useMemo(() => {
    if (!client) return undefined;

    const { account, chain, transport } = client;
    if (!account || !chain) return undefined;

    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: (chain.contracts as Record<string, { address?: string }> | undefined)
        ?.ensRegistry?.address,
    };

    const provider = new BrowserProvider(transport, network);
    return new JsonRpcSigner(provider, account.address);
  }, [client]);
}
