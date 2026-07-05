# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

danjiLog is a mobile-first PWA for a family to jointly log a cat's water/food intake. React + Vite + TypeScript + TailwindCSS + Supabase (Postgres + Auth), TanStack Query, React Hook Form + Zod, dayjs, react-router-dom v7.

## Commands

```bash
npm run dev       # start dev server (vite)
npm run build      # tsc -b (typecheck) then vite build
npm run preview    # preview the production build
npm run lint       # eslint .
```

There is no test suite/framework configured in this repo. Verify changes via `npm run build` (typecheck) and `npm run lint`.

Environment variables (`.env.local`, copy from `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FAMILY_LOGIN_EMAIL`.

## Architecture

**Auth model — single shared family login, no per-user accounts.** There's no signup UI. The login screen (`src/pages/LoginPage.tsx`) only asks for a 6-digit "code". `src/services/auth.ts` sends that code as the *password* for one fixed Supabase account whose email is `VITE_FAMILY_LOGIN_EMAIL` — the email is never shown in the UI. This exists so RLS still requires a real authenticated session while end users never see email/password concepts. `AuthContext` (`src/contexts/AuthContext.tsx`) just tracks the Supabase `Session`; `ProtectedRoute` redirects to `/login` when there's no session.

**Data layer is Supabase directly from the client**, split into three layers:
- `src/services/*.ts` — thin functions wrapping `supabase.from(...)` calls (pure data layer, no React).
- `src/hooks/*.ts` — TanStack Query hooks (`useQuery`/`useMutation`) that wrap the services. Query keys come from `src/lib/queryKeys.ts`. Mutations invalidate broadly (`queryKey: ["records"]`) rather than targeting specific ranges.
- Pages/components consume the hooks; they never call `services/` or `supabase` directly.

**Offline-first query caching.** `src/lib/queryClient.ts` configures TanStack Query with `networkMode: "offlineFirst"` and a 24h `gcTime`, persisted to `localStorage` via `PersistQueryClientProvider` (wired in `src/main.tsx`). This lets the PWA show recent data with no network. The service worker (`vite-plugin-pwa`, configured in `vite.config.ts`) additionally runtime-caches Supabase API responses with a `NetworkFirst` strategy.

**Routing/layout.** `src/App.tsx` defines routes; everything except `/login` is wrapped in `ProtectedRoute` + `MobileLayout` (`src/layouts/MobileLayout.tsx`, which renders `BottomNav`). `StatsPage` is lazy-loaded because `recharts` is heavy. `ScrollToTop` resets scroll on route change (browser scroll restoration is deliberately disabled in `main.tsx` since react-router owns it).

**Path alias:** `@/*` → `src/*` (configured in both `tsconfig.app.json` and `vite.config.ts`).

**Styling:** TailwindCSS with a custom iOS-like palette/tokens in `tailwind.config.js` (`ios.*` colors, `ios`/`ios-lg` radii, `water`/`food` colors for chart series, safe-area spacing). Dark mode is class-based, toggled via `useDarkMode`.
