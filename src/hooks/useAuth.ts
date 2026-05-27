import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { useCallback, useState } from "react";
import { mantleTestnet } from "@/lib/web3/config";

export interface UserInfo {
  id: string;
  email?: string;
  wallet?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  walletAddress: string | null;
  balance: string | null;
  chainId: number | undefined;
  isOnMantle: boolean;
  isSwitchingChain: boolean;
  switchChainError: string | null;
}

export function useAuth() {
  const { ready, authenticated, user, login, logout, linkWallet } = usePrivy();
  const { wallets } = useWallets();
  const { address } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const { data: balanceData } = useBalance({
    address: address,
    chainId: mantleTestnet.id,
  });

  const primaryWallet = wallets?.[0];
  const walletAddress = address || primaryWallet?.address || null;
  const activeChainId =
    wagmiChainId ??
    (primaryWallet?.chainId ? Number(String(primaryWallet.chainId).split(":").pop()) : undefined);
  const isOnMantle = activeChainId === mantleTestnet.id;

  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [switchChainError, setSwitchChainError] = useState<string | null>(null);

  const switchToMantle = useCallback(async () => {
    setSwitchChainError(null);
    setIsSwitchingChain(true);
    try {
      // Prefer Privy's switchChain (handles embedded wallets + injected)
      if (primaryWallet) {
        await primaryWallet.switchChain(mantleTestnet.id);
      } else if (switchChainAsync) {
        await switchChainAsync({ chainId: mantleTestnet.id });
      }
      return true;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to switch network. Please switch to Mantle Sepolia in your wallet.";
      setSwitchChainError(msg);
      console.error("switchToMantle failed:", err);
      return false;
    } finally {
      setIsSwitchingChain(false);
    }
  }, [primaryWallet, switchChainAsync]);

  const authState: AuthState = {
    isAuthenticated: authenticated,
    isLoading: !ready,
    user: user
      ? {
          id: user.id,
          email: user.email?.address || undefined,
          wallet: walletAddress || undefined,
        }
      : null,
    walletAddress,
    balance: balanceData ? `${parseFloat(balanceData.formatted).toFixed(4)} MNT` : null,
    chainId: activeChainId,
    isOnMantle,
    isSwitchingChain,
    switchChainError,
  };

  const connectWallet = async () => {
    if (!authenticated) {
      login();
      return;
    }
    if (primaryWallet) {
      await switchToMantle();
    } else {
      linkWallet();
    }
  };

  const disconnectWallet = async () => {
    logout();
  };

  return {
    ...authState,
    login,
    logout,
    linkWallet,
    connectWallet,
    disconnectWallet,
    switchToMantle,
    ready,
  };
}
