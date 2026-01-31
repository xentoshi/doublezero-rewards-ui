# DoubleZero Rewards Simulator

A tool for simulating fair reward distribution across DoubleZero network contributors. Operators can see how adding or removing fiber links affects every participant's reward share, computed using Shapley values from cooperative game theory.

## What It Does

- **Loads the live DoubleZero network** from the mainnet-beta topology repository (S3 snapshots at `doublezero-contributor-rewards-mn-beta-snapshots.s3.amazonaws.com`)
- **Simulates link changes** — add a proposed fiber connection between any two cities and instantly see how reward shares shift for every operator
- **Compares baseline vs. modified** — side-by-side Shapley value comparison showing who gains and who loses
- **Estimates per-link value** — for a given operator, see which of their existing links contributes the most to their total reward share
- **Interactive map** — MapLibre-powered visualization of the full network topology with operator filtering

## Tech Stack

**Frontend:** Next.js 14, TypeScript, Zustand, MapLibre GL, Recharts, Radix UI, Tailwind CSS

**Backend:** FastAPI, NumPy, SciPy, Pandas (see `../backend/`)

## Getting Started

### Prerequisites

- Node.js 18+
- The backend API running (defaults to `http://localhost:8000`)

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, point this to your deployed backend URL.

### Build for Production

```bash
npm run build
npm start
```

## Deployment

### Frontend (Vercel)

The Next.js frontend deploys to Vercel. Set `NEXT_PUBLIC_API_URL` in Vercel's environment variables to point to your deployed backend.

### Backend (separate host)

The FastAPI backend must be deployed separately (e.g. Railway, Render, Fly.io, or any server). It cannot run on Vercel since it's a Python server with heavy computation (Shapley values are O(2^n)).

### Docker

```bash
# From the repo root
docker-compose up
```

## Project Structure

```
src/
  app/
    page.tsx              Main page — header, modes, dialogs, layout
    layout.tsx            Root layout and metadata
    globals.css           Newsprint design system tokens
  components/
    ui/                   Radix-based primitives (button, card, table, etc.)
    features/
      DataLoader.tsx      Landing — load live network or start empty
      NetworkMap.tsx       Interactive map with curved arcs and operator legend
      QuickAddLink.tsx     Add a link and auto-run comparison
      NetworkEditor.tsx    Tabs for link and demand editing
      ResultsDisplay.tsx   Bar chart + comparison table with tooltips
      LinkValueMode.tsx    Per-link Shapley value estimation
      BaselineDiff.tsx     Badge summary of network changes
  store/
    networkStore.ts       Zustand store — all state, CRUD, validation
  lib/
    api.ts                Backend API calls (compare, link-estimate)
    liveData.ts           Fetch live topology from backend
    cities.ts             40+ city coordinates and names
    utils.ts              Colors, formatting, ID generation
  types/
    network.ts            TypeScript interfaces for all data
```

## Data Source

Live network data is fetched from the DoubleZero mainnet-beta topology repository via the backend API. The backend reads epoch snapshots from an S3 bucket (`doublezero-contributor-rewards-mn-beta-snapshots.s3.amazonaws.com`), parsing registered operators, devices, private links, and their geographic locations. This is the same source of truth used by the DoubleZero network registry.
