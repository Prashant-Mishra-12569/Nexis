import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Database, Check, Rocket } from "lucide-react";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();

  const tables = [
    { key: "profiles", name: "profiles" },
    { key: "ideas", name: "ideas" },
    { key: "matches", name: "matches" },
    { key: "swipes", name: "swipes" },
    { key: "saved", name: "saved" },
    { key: "sentiment", name: "sentiment" },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 max-w-lg w-full neon-border space-y-6"
      >
        <div className="text-center">
          <Database className="h-12 w-12 text-[var(--neon)] mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold">Storage Console</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Automated cloud database powered by high-performance Supabase storage.
          </p>
        </div>

        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-[var(--neon)] text-sm font-medium">
            <Check className="h-4 w-4" /> Cloud storage tables active
          </div>
          <div className="space-y-2 pt-2">
            {tables.map((t) => (
              <div key={t.key} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground capitalize">{t.key}</span>
                <span className="font-mono text-[var(--neon)] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon)]" /> online
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate({ to: "/feed" })}
            className="w-full mt-5 px-5 py-3 rounded-full bg-[var(--neon)] text-black font-semibold text-sm hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <Rocket className="h-4 w-4" /> Launch Nexis App →
          </button>
        </div>

        <div className="text-[10px] text-muted-foreground text-center">
          Gasless database transactions enabled. Privy wallets, smart contract checks, and XMTP chats remain fully decentralized.
        </div>
      </motion.div>
    </div>
  );
}
