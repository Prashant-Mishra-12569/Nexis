import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, mantleTestnet } from "@/lib/web3/config";

const queryClient = new QueryClient();

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet", "google", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#00ff9d",
          logo: "/nexis-logo.svg",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: mantleTestnet,
        supportedChains: [mantleTestnet],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
