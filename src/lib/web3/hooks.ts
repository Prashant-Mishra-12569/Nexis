import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, keccak256, toBytes, decodeEventLog } from "viem";
import { NEXIS_FINANCE_ABI, NEXIS_DEAL_NFT_ABI } from "./abis";
import { CONTRACT_ADDRESSES, FEES, mantleTestnet } from "./config";

// Generate unique idea ID from title and builder address
export function generateIdeaId(title: string, builderAddress: string): `0x${string}` {
  return keccak256(toBytes(`${title}-${builderAddress}-${Date.now()}`));
}

// ========== NexisFinance Hooks ==========

export function useIsVerifiedBuilder(address: string | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.NEXIS_FINANCE as `0x${string}`,
    abi: NEXIS_FINANCE_ABI,
    functionName: "isVerifiedBuilder",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!CONTRACT_ADDRESSES.NEXIS_FINANCE,
    },
  });
}

export function usePayOnboarding() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const payOnboarding = () => {
    if (!CONTRACT_ADDRESSES.NEXIS_FINANCE) {
      console.error("Contract address not set");
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESSES.NEXIS_FINANCE as `0x${string}`,
      abi: NEXIS_FINANCE_ABI,
      functionName: "payOnboarding",
      value: FEES.ONBOARDING,
      chain: mantleTestnet,
    });
  };

  return {
    payOnboarding,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function usePayExtraIdea() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const payExtraIdea = (ideaId: `0x${string}`) => {
    if (!CONTRACT_ADDRESSES.NEXIS_FINANCE) {
      console.error("Contract address not set");
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESSES.NEXIS_FINANCE as `0x${string}`,
      abi: NEXIS_FINANCE_ABI,
      functionName: "payExtraIdea",
      args: [ideaId],
      value: FEES.EXTRA_IDEA,
      chain: mantleTestnet,
    });
  };

  return {
    payExtraIdea,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useListFreeIdea() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const listFreeIdea = (ideaId: `0x${string}`) => {
    if (!CONTRACT_ADDRESSES.NEXIS_FINANCE) {
      console.error("Contract address not set");
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESSES.NEXIS_FINANCE as `0x${string}`,
      abi: NEXIS_FINANCE_ABI,
      functionName: "listFreeIdea",
      args: [ideaId],
      chain: mantleTestnet,
    });
  };

  return {
    listFreeIdea,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useBuyBoost() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const buyBoost = (tier: 0 | 1 | 2, ideaId: `0x${string}`) => {
    if (!CONTRACT_ADDRESSES.NEXIS_FINANCE) {
      console.error("Contract address not set");
      return;
    }

    const feeMap = {
      0: FEES.BASIC_BOOST,
      1: FEES.PRO_BOOST,
      2: FEES.ELITE_BOOST,
    };

    writeContract({
      address: CONTRACT_ADDRESSES.NEXIS_FINANCE as `0x${string}`,
      abi: NEXIS_FINANCE_ABI,
      functionName: "buyBoost",
      args: [tier, ideaId],
      value: feeMap[tier],
      chain: mantleTestnet,
    });
  };

  return {
    buyBoost,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useBoostDetails(ideaId: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.NEXIS_FINANCE as `0x${string}`,
    abi: NEXIS_FINANCE_ABI,
    functionName: "getBoostDetails",
    args: ideaId ? [ideaId] : undefined,
    query: {
      enabled: !!ideaId && !!CONTRACT_ADDRESSES.NEXIS_FINANCE,
    },
  });
}

// ========== NexisDealNFT Hooks ==========

export function useRequestDealConfirmation() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const requestDeal = (investorAddress: string, startupName: string, tokenURI: string) => {
    if (!CONTRACT_ADDRESSES.NEXIS_DEAL_NFT) {
      console.error("Contract address not set");
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESSES.NEXIS_DEAL_NFT as `0x${string}`,
      abi: NEXIS_DEAL_NFT_ABI,
      functionName: "requestDealConfirmation",
      args: [investorAddress as `0x${string}`, startupName, tokenURI],
      chain: mantleTestnet,
    });
  };

  // Once the receipt arrives, extract dealId from the DealRequested event log
  let dealId: `0x${string}` | undefined;
  if (receipt) {
    for (const log of receipt.logs) {
      try {
        const parsed = decodeEventLog({
          abi: NEXIS_DEAL_NFT_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (parsed.eventName === "DealRequested") {
          dealId = (parsed.args as { dealId: `0x${string}` }).dealId;
          break;
        }
      } catch {
        // Not our event, skip
      }
    }
  }

  return {
    requestDeal,
    hash,
    dealId,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useConfirmDeal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const confirmDeal = (dealId: `0x${string}`) => {
    if (!CONTRACT_ADDRESSES.NEXIS_DEAL_NFT) {
      console.error("Contract address not set");
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESSES.NEXIS_DEAL_NFT as `0x${string}`,
      abi: NEXIS_DEAL_NFT_ABI,
      functionName: "confirmDeal",
      args: [dealId],
      chain: mantleTestnet,
    });
  };

  return {
    confirmDeal,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useRejectDeal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const rejectDeal = (dealId: `0x${string}`) => {
    if (!CONTRACT_ADDRESSES.NEXIS_DEAL_NFT) {
      console.error("Contract address not set");
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESSES.NEXIS_DEAL_NFT as `0x${string}`,
      abi: NEXIS_DEAL_NFT_ABI,
      functionName: "rejectDeal",
      args: [dealId],
      chain: mantleTestnet,
    });
  };

  return {
    rejectDeal,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useIsDealPending(dealId: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.NEXIS_DEAL_NFT as `0x${string}`,
    abi: NEXIS_DEAL_NFT_ABI,
    functionName: "isDealPending",
    args: dealId ? [dealId] : undefined,
    query: {
      enabled: !!dealId && !!CONTRACT_ADDRESSES.NEXIS_DEAL_NFT,
    },
  });
}

export function useTotalDeals() {
  return useReadContract({
    address: CONTRACT_ADDRESSES.NEXIS_DEAL_NFT as `0x${string}`,
    abi: NEXIS_DEAL_NFT_ABI,
    functionName: "totalDeals",
    query: {
      enabled: !!CONTRACT_ADDRESSES.NEXIS_DEAL_NFT,
    },
  });
}
