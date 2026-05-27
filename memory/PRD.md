# Nexis — PRD

## Original problem statement
> "Go on every page of the website and make sure it is fully functional, remove all the hardcoded part and make it ready to use. Solve every problem and make sure that each button the website should work and every data of the every page of the website should be real and loaded from the backend or smart contract."
>
> Repo: https://github.com/Prashant-Mishra-12569/Nexis — "Web3 Tinder for builders & investors" on Mantle Sepolia.

## Architecture
- **Frontend**: React 19 + TanStack Start/Router + Vite 7 (SSR-capable) + Tailwind v4
- **Web3**: Wagmi v2 + Viem + Privy Auth (email or wallet) on Mantle Sepolia (chainId 5003)
- **Contracts (deployed)**:
  - `NexisFinance` `0x652515Ea00993bb309616d8a708846c129BF9aE7` — onboarding fee, idea listing, boosts
  - `NexisDealNFT` `0x5Efb1Cc6d6116c5e2b0fCb657dB04A5BB0f2E20A` — soulbound proof-of-funding NFTs
- **Off-chain storage**: localStorage per-wallet (ideas, swipes, matches, messages, profiles, views, sentiment)
- **IPFS**: Pinata for images, pitch videos, pitch decks, NFT metadata
- **Chat**: XMTP (lib wired, currently demo-ready — needs signer init for production E2E)
- **Process**: Vite dev server on port 3000 via supervisor `frontend` (wrapper at `/app/frontend/package.json` running bun)

## User personas
- **Builder** — pays 1 MNT to become verified, lists first idea free, pays 0.5 MNT for additional ideas, can boost listings (3/5/10 MNT).
- **Investor** — free signup, swipes through curated feed, requests deal-confirmation NFT on close.

## Core requirements (static)
1. Every page reflects real data from wallet + localStorage + smart contracts — no hardcoded names, addresses, stats.
2. Every interactive element has a working handler and `data-testid`.
3. Auth-gated pages (Dashboard / Chat / Profile) prompt connect when not signed-in.
4. Onboarding actually persists user profile + triggers on-chain `payOnboarding`.
5. New-idea flow saves to local ideas store *and* calls `listFreeIdea` (first) or `payExtraIdea`.

## What's been implemented (2026-01-27)

### Iteration 3 — Routing fix + Save-for-later (latest)
- **Fixed "+ New idea" / "+ Create first idea" buttons** — Root cause: `dashboard.new-idea.tsx` was a *nested* child route under `dashboard.tsx`, but `dashboard.tsx` has no `<Outlet />`, so the child never rendered. The dashboard layout was just rendered instead with the URL pointing at `/dashboard/new-idea`. Renamed file to `dashboard_.new-idea.tsx` (TanStack flat-path syntax — trailing underscore makes the parent segment pathless) so the route renders independently. Now the full 5-step wizard (Basics → Details → Financials → Team → Review) loads correctly.
- **Save-for-later bookmark feature** — Replaced the ambiguous Star "info" button in the SwipeDeck with two dedicated buttons:
  - **Yellow Bookmark** — toggles "save for later" (`toggleSavedIdea`) with a confirmation toast _"Saved to your bookmarks"_ / _"Removed from bookmarks"_, and the icon fills yellow when saved.
  - **Blue Star** — opens the IdeaExpandView for full details.
  Also added a matching Bookmark button inside both mobile + desktop variants of `IdeaExpandView`, so users can save while reading.
- **New profile section "Saved for later"** — Lists all bookmarked ideas (thumbnail, name, industry, ask/equity) with a hover-revealed × button to unsave, and a hint when empty. Updates in real-time when the store changes via `onSavedChange` callback wired through SwipeDeck → IdeaExpandView.
- **Storage layer** — Added `nexis_saved_ideas` localStorage key with timestamps (so most-recently-saved appear first), `isIdeaSaved` / `toggleSavedIdea` / `getSavedIdeas` helpers, and reset/clear hooks.

### Iteration 2 — Network safety + new-wallet onboarding
- **Wrong-network detection** — Added `useAuth.isOnMantle` + `chainId` from `useChainId`. A persistent amber **WrongNetworkBanner** is now shown on every authenticated app page when the wallet is on the wrong chain (e.g. Base Sepolia). One-click "Switch to Mantle Sepolia" via `primaryWallet.switchChain(5003)` (Privy) with fallback to `wagmi.switchChain`.
- **Action-button guards** — Onboarding "Pay 1 MNT", New-idea "Submit Idea", and Dashboard "Boost" buttons are all wrapped in `<NetworkGuard>`. If the wallet is connected but not on Mantle, the action button is replaced by a yellow "Switch to Mantle Sepolia" CTA — making it impossible to ever fire a tx on the wrong chain.
- **New-wallet auto-redirect** — `AppShell` now checks `getProfile(wallet)` + on-chain `isVerifiedBuilder`. If both are empty and the user is on any app route (not `/` or `/onboarding`), they're redirected to `/onboarding` to pick Builder/Investor before being dropped into the builder/investor flows.
- **Infra resilience** — Platform was overwriting `/app/frontend/package.json` with a CRA template on every restart, killing the Vite dev server. Restored the wrapper script that delegates `yarn start` → `bun run dev` on the actual TanStack Start app at `/app`.

### Iteration 1 — Full functionality wiring (foundational)
- **Profile page** — Fully dynamic: real wallet, balance, profile name/socials/location from per-wallet store, real ideas count, real right-swipes received, real Proof-of-Funding cards from matches, copy-to-clipboard, Mantlescan explorer link, Edit profile link.
- **Dashboard** — Shows only the current wallet's ideas, real views/likes/dislikes sentiment from `getIdeaSentiment` + `getIdeaViews`, real matches count, expiry days remaining per idea, Boost modal calling `useBuyBoost` with correct ideaId for the selected idea.
- **New Idea form** — Fully wired: persists via `addIdea(...)`, calls `listFreeIdea` for owner's first idea or `payExtraIdea` (with verified-builder gate via `useIsVerifiedBuilder`). All fields are controlled, IPFS uploads return URLs that are stored, implied valuation calculated live.
- **Onboarding** — Inputs are now controlled and saved to `profileStore` (builder or investor variant). Investor preferences (ticket size + industries) persist. Fixed `setTimeout(navigate)` anti-pattern by moving redirect into `useEffect`. Pre-fills form for returning users.
- **AppShell** — Real wallet + balance + initials in sidebar, Logout button, working Connect button. Real-time **unread match badges** on Chat nav. **Functional search** with live results dropdown. **Notifications dropdown** listing recent matches with deep-links.
- **Feed page** — Trending / Newest sort + 8 industry filters all functional, own ideas excluded from feed, expired ideas filtered out, view counter increments per card seen, clear-filter button when industry active.
- **SwipeDeck** — Accepts external `ideas` prop, calls `onChanged` to refresh parent on swipe, view-counter tracking, "Reset Feed" button works.
- **Chat** — Real founder name + industry from idea data, working Accept/Decline, message persistence per-match, last-message updates in sidebar, mark-read on open, Request Deal NFT now uses real `industry` and validates investor address before contract call.
- **Landing** — Real ideas/matches/capital stats from store (fixed buggy capital calculation), Connect/Disconnect flow, data-testids on all CTAs.
- **Stores added/extended**: `profileStore.ts` (per-wallet profiles), idea-sentiment tracker, idea-view counter, match read/decline/update helpers, getIdeasByOwner / getReceivedRightSwipes / getOwnerTotalViews.
- **Code hygiene**: deleted orphan `lib/nexis/data.ts`, fixed missing `ethers` typing in `xmtp.ts`, zero TS errors, zero ESLint errors (only pre-existing shadcn fast-refresh warnings).
- **Infra**: bun installed, vite.config wired to bind 0.0.0.0:3000 with HMR over wss, supervisor wrapper at `/app/frontend/package.json`.

## How it works end-to-end (verified live)
1. Visit `/` → Launch App → routes to `/feed`.
2. On `/feed`, click "Newest" or any industry pill → list re-filters/re-sorts; swipe right → match is created; bell + Chat sidebar badge increment in real time.
3. `/profile`, `/dashboard`, `/chat` correctly prompt wallet connection if not signed in.
4. After wallet sign-in via Privy → `/onboarding` → user fills form → builder pays 1 MNT (`payOnboarding`) → redirect to dashboard.
5. `/dashboard/new-idea` → 5-step form → submit → `listFreeIdea` (first idea) or `payExtraIdea` (subsequent) → idea appears on `/feed` for others, on `/profile` + `/dashboard` for owner.
6. Boost modal on dashboard → tier select → `buyBoost(tier, ideaId)` on Mantle Sepolia.
7. Chat → Accept match → message → Request Deal NFT → `createDealNFTMetadata` (Pinata) → `requestDealConfirmation` on `NexisDealNFT`.

## Prioritized backlog
- **P1**: Wire real XMTP `initXMTP(signer)` instead of the 600ms simulated ready flag (lib exists at `src/lib/web3/xmtp.ts`).
- **P1**: Read `isIdeaBoosted` / `getBoostDetails` to render boosted badges in feed and re-rank.
- **P2**: Index on-chain `IdeaListed` / `IdeaBoosted` events to sync ideas across devices (right now ideas live in per-browser localStorage).
- **P2**: AI match-score that scores investor ↔ idea using investor thesis + idea industry (currently the score field is a static 75–95 random).
- **P3**: Idea renewal flow — `expiry.ts` already supports `canRenewIdea`/`renewIdea`; needs UI on `/dashboard`.
- **P3**: Mobile bottom-sheet polish on `IdeaExpandView`.

## Next tasks
- Hook XMTP for real E2E chat (requires viem WalletClient → ethers-compatible signer adapter).
- Build cross-device idea sync (subgraph or simple JSON API) so ideas aren't trapped per-browser.
- Add deal-NFT mint flow (currently only the *request* is implemented; counter-party must call `confirmDeal`).
