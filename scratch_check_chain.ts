import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

const mantleTestnet = defineChain({
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
  testnet: true,
});

const client = createPublicClient({
  chain: mantleTestnet,
  transport: http(),
});

const FINANCE_ADDRESS = "0x652515Ea00993bb309616d8a708846c129BF9aE7";
const BUILDER_ADDRESS = "0x4780d36b6b0367faf6f38d6006f7d6d904cc972c";

const ABI = [
  {
    inputs: [{ internalType: "address", name: "builder", type: "address" }],
    name: "isVerifiedBuilder",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "builderIdeaCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function main() {
  console.log("Checking builder status for:", BUILDER_ADDRESS);

  const isVerified = await client.readContract({
    address: FINANCE_ADDRESS,
    abi: ABI,
    functionName: "isVerifiedBuilder",
    args: [BUILDER_ADDRESS],
  });

  const ideaCount = await client.readContract({
    address: FINANCE_ADDRESS,
    abi: ABI,
    functionName: "builderIdeaCount",
    args: [BUILDER_ADDRESS],
  });

  console.log("isVerifiedBuilder:", isVerified);
  console.log("builderIdeaCount:", ideaCount.toString());
}

main().catch(console.error);
