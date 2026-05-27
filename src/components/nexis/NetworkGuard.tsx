import { AlertTriangle, Loader2, Wifi } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mantleTestnet } from "@/lib/web3/config";

/**
 * Renders a "Switch to Mantle Sepolia" call-to-action when the wallet is connected
 * to a different network. Use this in-place of an action button (boost, pay, list, etc.)
 * so users on the wrong chain are blocked before the tx hits MetaMask.
 *
 * Pass `children` for the actual action button — it will be rendered when the chain is correct.
 */
export function NetworkGuard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isAuthenticated, isOnMantle, isSwitchingChain, switchChainError, switchToMantle } =
    useAuth();

  if (!isAuthenticated) return <>{children}</>;
  if (isOnMantle) return <>{children}</>;

  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="network-guard">
      <button
        onClick={switchToMantle}
        disabled={isSwitchingChain}
        data-testid="switch-to-mantle-btn"
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-500 text-black font-semibold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
      >
        {isSwitchingChain ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Switching…
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" /> Switch to Mantle Sepolia
          </>
        )}
      </button>
      {switchChainError && (
        <div className="text-xs text-rose-400 text-center" data-testid="switch-chain-error">
          {switchChainError}
        </div>
      )}
    </div>
  );
}

/**
 * Top-of-page banner that appears when the wallet is connected but on the wrong chain.
 * Drop into AppShell so it's visible across the whole app.
 */
export function WrongNetworkBanner() {
  const { isAuthenticated, isOnMantle, chainId, isSwitchingChain, switchToMantle } = useAuth();

  if (!isAuthenticated || isOnMantle) return null;

  return (
    <div
      className="sticky top-0 z-40 w-full bg-amber-500/10 border-b border-amber-500/30 px-4 md:px-8 py-2.5 flex items-center justify-between gap-3"
      data-testid="wrong-network-banner"
    >
      <div className="flex items-center gap-2 text-xs text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Wrong network detected (chain&nbsp;ID&nbsp;
          <span className="font-mono">{chainId ?? "?"}</span>). Nexis runs on{" "}
          <span className="font-semibold text-amber-100">{mantleTestnet.name}</span>.
        </span>
      </div>
      <button
        onClick={switchToMantle}
        disabled={isSwitchingChain}
        data-testid="banner-switch-btn"
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-black text-xs font-semibold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
      >
        {isSwitchingChain ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" /> Switching…
          </>
        ) : (
          "Switch"
        )}
      </button>
    </div>
  );
}
