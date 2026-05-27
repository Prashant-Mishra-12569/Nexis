import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { wagmiConfig, mantleTestnet } from "@/lib/web3/config";

import appCss from "../styles.css?url";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nexis — Swipe. Match. Build." },
      {
        name: "description",
        content:
          "The on-chain matchmaking engine where founders meet conviction capital in a single swipe.",
      },
      { name: "author", content: "Nexis Labs" },
      { property: "og:title", content: "Nexis — Swipe. Match. Build." },
      { property: "og:description", content: "Tinder for Web3 startups. Built on Mantle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function MissingEnvScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white"
      data-testid="missing-env-screen"
    >
      <div className="max-w-xl w-full rounded-2xl border border-amber-500/40 bg-amber-500/5 p-8 shadow-2xl">
        <div className="text-amber-400 text-xs uppercase tracking-widest">Configuration error</div>
        <h1 className="mt-2 text-2xl font-bold">
          Missing{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-base">VITE_PRIVY_APP_ID</code>
        </h1>
        <p className="mt-3 text-sm text-white/70">
          The app can't start without a Privy app ID. This usually means your local{" "}
          <code className="rounded bg-black/40 px-1 text-xs">.env</code> file is missing or empty.
        </p>
        <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4 text-xs font-mono leading-relaxed">
          <div className="text-amber-300">How to fix:</div>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-white/80">
            <li>
              Copy <code className="rounded bg-white/5 px-1">.env.example</code> to{" "}
              <code className="rounded bg-white/5 px-1">.env</code> in the project root.
            </li>
            <li>
              Fill in <code className="rounded bg-white/5 px-1">VITE_PRIVY_APP_ID</code> (and Pinata
              JWT) with real values.
            </li>
            <li>
              Stop and re-run <code className="rounded bg-white/5 px-1">npm run dev</code> (Vite
              reads env only at startup).
            </li>
          </ol>
        </div>
        <p className="mt-4 text-[11px] text-white/40">
          Get a free Privy app ID at <span className="text-amber-300">dashboard.privy.io</span>.
        </p>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  if (!PRIVY_APP_ID) {
    return <MissingEnvScreen />;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#00ff9d",
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: mantleTestnet,
        supportedChains: [mantleTestnet],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <Outlet />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
