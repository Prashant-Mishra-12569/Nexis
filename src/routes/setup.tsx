import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Shield,
  Check,
  Loader2,
  Rocket,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTablelandSigner } from "@/hooks/useTablelandSigner";
import { createAllTables, setControllerOnTables, type SetupProgress } from "@/lib/tableland/setup";
import {
  isTablesReady,
  getTableNames,
  ALLOW_ALL_CONTROLLER_ABI,
  ALLOW_ALL_CONTROLLER_BYTECODE,
  setControllerAddress as storeControllerAddress,
  getControllerAddress,
} from "@/lib/tableland/config";
import { useDeployContract, useWaitForTransactionReceipt } from "wagmi";
import { mantleTestnet } from "@/lib/web3/config";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, walletAddress, login } = useAuth();
  const signer = useTablelandSigner();

  const [phase, setPhase] = useState<"idle" | "deploying" | "tables" | "controller" | "done">(
    "idle",
  );
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controllerAddr, setControllerAddr] = useState<string>(getControllerAddress() || "");

  const {
    deployContract,
    data: deployHash,
    isPending: isDeploying,
  } = useDeployContract();

  const { data: deployReceipt, isLoading: isWaitingDeploy } = useWaitForTransactionReceipt({
    hash: deployHash,
  });

  // If already set up, show status
  const ready = isTablesReady();
  const tables = getTableNames();

  async function handleFullSetup() {
    if (!signer) return;
    setError(null);

    try {
      // Phase 1: Deploy AllowAll controller
      if (!controllerAddr) {
        setPhase("deploying");
        deployContract({
          abi: ALLOW_ALL_CONTROLLER_ABI,
          bytecode: ALLOW_ALL_CONTROLLER_BYTECODE,
          chain: mantleTestnet,
        });
        // Wait for receipt via useEffect handled separately
        return;
      }

      // Phase 2: Create tables
      setPhase("tables");
      const newTables = await createAllTables(signer, setProgress);

      // Phase 3: Set controller on all tables
      setPhase("controller");
      await setControllerOnTables(signer, newTables, controllerAddr, setProgress);

      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
      setPhase("idle");
    }
  }

  async function handleCreateTablesOnly() {
    if (!signer) return;
    setError(null);
    try {
      setPhase("tables");
      const newTables = await createAllTables(signer, setProgress);
      if (controllerAddr) {
        setPhase("controller");
        await setControllerOnTables(signer, newTables, controllerAddr, setProgress);
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
      setPhase("idle");
    }
  }

  // Handle deploy receipt
  if (deployReceipt && phase === "deploying") {
    const addr = deployReceipt.contractAddress;
    if (addr) {
      storeControllerAddress(addr);
      setControllerAddr(addr);
      setPhase("idle"); // Ready to create tables
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-8 max-w-md text-center neon-border">
          <Wallet className="h-12 w-12 text-[var(--neon)] mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Admin Setup</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Connect your wallet to set up Tableland tables for Nexis.
          </p>
          <button
            onClick={() => login()}
            className="px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 max-w-lg w-full neon-border space-y-6"
      >
        <div className="text-center">
          <Database className="h-12 w-12 text-[var(--neon)] mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">Tableland Setup</h1>
          <p className="text-sm text-muted-foreground mt-2">
            One-time setup to create decentralized database tables on Mantle Sepolia.
          </p>
        </div>

        {ready && tables && (
          <div className="glass rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-[var(--neon)] text-sm font-medium">
              <Check className="h-4 w-4" /> Tables already created
            </div>
            {Object.entries(tables).map(([key, name]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">{key}</span>
                <span className="font-mono text-white/70 truncate max-w-[250px]">{name}</span>
              </div>
            ))}
            <button
              onClick={() => navigate({ to: "/feed" })}
              className="w-full mt-3 px-4 py-2 rounded-full bg-[var(--neon)] text-black font-semibold text-sm hover:scale-105 transition-all"
            >
              Go to App →
            </button>
          </div>
        )}

        {!ready && (
          <>
            {/* Controller address input */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                AllowAll Controller Address
              </label>
              <div className="flex gap-2">
                <input
                  value={controllerAddr}
                  onChange={(e) => setControllerAddr(e.target.value)}
                  placeholder="0x... (deploy below or paste existing)"
                  className="flex-1 bg-white/5 rounded-lg px-4 py-2 text-sm border border-white/10 focus:border-[var(--neon)]/40 outline-none font-mono"
                />
                <button
                  onClick={() => {
                    if (!controllerAddr) {
                      deployContract({
                        abi: ALLOW_ALL_CONTROLLER_ABI,
                        bytecode: ALLOW_ALL_CONTROLLER_BYTECODE,
                        chain: mantleTestnet,
                      });
                      setPhase("deploying");
                    }
                  }}
                  disabled={!!controllerAddr || isDeploying || isWaitingDeploy}
                  className="px-4 py-2 rounded-lg neon-border text-[var(--neon)] text-xs hover:bg-[var(--neon)] hover:text-black transition-all disabled:opacity-50"
                >
                  {isDeploying || isWaitingDeploy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : controllerAddr ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    "Deploy"
                  )}
                </button>
              </div>
              {controllerAddr && (
                <div className="flex items-center gap-1 text-xs text-[var(--neon)]">
                  <Shield className="h-3 w-3" /> Controller ready
                </div>
              )}
            </div>

            {/* Create tables button */}
            <button
              onClick={handleCreateTablesOnly}
              disabled={phase !== "idle" || !signer}
              className="w-full px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {phase === "tables" || phase === "controller" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {progress ? `${progress.step} (${progress.current}/${progress.total})` : "Creating…"}
                </>
              ) : phase === "done" ? (
                <>
                  <Check className="h-4 w-4" /> Setup Complete!
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" /> Create All Tables
                </>
              )}
            </button>
          </>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-xl p-3 border border-rose-500/30"
            >
              <div className="flex items-center gap-2 text-rose-400 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <button
              onClick={() => navigate({ to: "/feed" })}
              className="px-6 py-3 rounded-full bg-[var(--neon)] text-black font-semibold hover:scale-105 transition-all"
            >
              Launch Nexis →
            </button>
          </motion.div>
        )}

        <div className="text-[10px] text-muted-foreground text-center">
          Each table creation is an on-chain transaction on Mantle Sepolia. You'll sign ~6
          transactions. Gas is minimal on testnet.
        </div>
      </motion.div>
    </div>
  );
}
