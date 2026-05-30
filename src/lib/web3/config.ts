import { http, fallback, createConfig } from "wagmi";
import { defineChain } from "viem";

// Define Mantle Sepolia Testnet with robust fallback RPC endpoints
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
      http: [
        "https://rpc.sepolia.mantle.xyz",
        "https://mantle-sepolia.drpc.org",
        "https://5003.rpc.thirdweb.com",
        "https://endpoints.omniatech.io/v1/mantle/sepolia/public"
      ],
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

// Wagmi config with automatic failover/fallback transport
export const wagmiConfig = createConfig({
  chains: [mantleTestnet],
  transports: {
    [mantleTestnet.id]: fallback([
      http("https://rpc.sepolia.mantle.xyz"),
      http("https://mantle-sepolia.drpc.org"),
      http("https://5003.rpc.thirdweb.com"),
      http("https://endpoints.omniatech.io/v1/mantle/sepolia/public")
    ]),
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
