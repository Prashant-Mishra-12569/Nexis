# Nexis — Product Requirements Document (Updated)

## What is Nexis?

A **fully decentralized** Web3 "Tinder for builders & investors" on **Mantle Sepolia testnet**.
Founders list startup ideas; investors swipe through a curated feed.
Mutual interest opens encrypted chat (XMTP). When a deal closes, a **soulbound proof-of-funding NFT** is minted.

## Architecture — Fully Decentralized Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Auth** | Privy (email + wallet) | Web3 authentication |
| **Structured Data** | **Tableland** (SQL on-chain) | Profiles, Ideas, Matches, Swipes, Saved, Sentiment |
| **Messaging** | **XMTP Browser SDK v7** | E2E encrypted cross-device chat |
| **Financial Ops** | Smart Contracts (NexisFinance + NexisDealNFT) | Payments, verification, NFTs |
| **File Storage** | Pinata / IPFS | Images, videos, pitch decks, NFT metadata |
| **Frontend** | React 19 + TanStack Router + Vite 7 + Tailwind v4 | SPA |
| **UI Components** | Shadcn/UI + Custom (SwipeDeck, AppShell, etc.) | Design system |

### **ZERO localStorage for app data.** All data lives on Tableland, XMTP, smart contracts, or IPFS.

## Tableland Tables (6 tables on Mantle Sepolia)

1. **nexis_profiles** — User profiles with role locking (builder/investor)
2. **nexis_ideas** — Startup ideas with metadata
3. **nexis_matches** — Match records between investors and builders
4. **nexis_swipes** — Swipe history (liked/disliked)
5. **nexis_saved** — Bookmarked ideas
6. **nexis_sentiment** — Views, likes, dislikes per idea

## Setup Flow

1. Admin goes to `/setup`
2. Deploys AllowAll controller contract (1 tx)
3. Creates 6 Tableland tables (6 txs)
4. Sets controller on each table (6 txs)
5. App is ready for all users

## Key Flows

### Onboarding
- User connects wallet → picks Builder or Investor
- **Role is PERMANENTLY locked** to wallet address
- Builder pays 1 MNT on-chain → profile saved to Tableland
- Investor skips payment → profile saved to Tableland

### Builder Creates Idea
- 5-step wizard → idea saved to Tableland
- First idea free (on-chain `listFreeIdea`), additional cost 0.5 MNT

### Investor Discovers & Swipes
- Feed pulls ideas from Tableland (no mock data)
- Left swipe = pass, Right swipe = interested
- Swipe recorded in Tableland
- Right swipe creates a Match in Tableland (status: "pending")

### Match Flow
- **Builder** sees pending match in chat inbox
- **Builder** accepts or declines (NOT the investor)
- Accept → chat opens via XMTP
- Decline → match removed

### Chat (XMTP)
- E2E encrypted, cross-device
- Messages show correct sender/receiver sides
- Real-time streaming

### Deal NFT Flow
- **Builder only** can request Deal NFT
- Builder clicks "Request Deal NFT" → on-chain `requestDealConfirmation`
- Investor sees "Confirm & Mint NFT" button
- Investor confirms → soulbound NFT minted to builder
- Shows as achievement in builder's profile

## Smart Contracts (Deployed)

- **NexisFinance**: `0x652515Ea00993bb309616d8a708846c129BF9aE7`
- **NexisDealNFT**: `0x5Efb1Cc6d6116c5e2b0fCb657dB04A5BB0f2E20A`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with stats, how-it-works, CTAs |
| `/setup` | Admin Tableland table creation wizard |
| `/onboarding` | Role picker + profile form |
| `/feed` | Swipe deck with filters |
| `/dashboard` | Builder console (ideas, stats, boost) |
| `/dashboard/new-idea` | 5-step idea creation wizard |
| `/chat` | Match inbox + XMTP messaging |
| `/profile` | User profile with stats + achievements |

## UI Enhancements

- Custom animated neon cursor (outer ring + inner dot)
- Smooth page transitions
- Shimmer loading effects
- Touch-friendly tap targets on mobile
- Responsive typography
- Focus-visible states
