import { http, createConfig } from "wagmi";
import { defineChain } from "viem";

// Define Mantle Sepolia Testnet
export const mantleTestnet = defineChain({
  id: 5003,
  name: "Mantle Sepolia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MNT",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://sepolia.mantlescan.xyz",
    },
  },
  testnet: true,
});

// Wagmi config
export const wagmiConfig = createConfig({
  chains: [mantleTestnet],
  transports: {
    [mantleTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
  },
});

// Contract addresses (update after deployment)
export const CONTRACT_ADDRESSES = {
  NEXIS_FINANCE: import.meta.env.VITE_NEXIS_FINANCE_ADDRESS || "",
  NEXIS_DEAL_NFT: import.meta.env.VITE_NEXIS_DEAL_NFT_ADDRESS || "",
} as const;

// Fee amounts in wei
export const FEES = {
  ONBOARDING: BigInt("1000000000000000000"), // 1 MNT
  EXTRA_IDEA: BigInt("500000000000000000"), // 0.5 MNT
  BASIC_BOOST: BigInt("3000000000000000000"), // 3 MNT
  PRO_BOOST: BigInt("5000000000000000000"), // 5 MNT
  ELITE_BOOST: BigInt("10000000000000000000"), // 10 MNT
} as const;
