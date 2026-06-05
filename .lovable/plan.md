
# Plan

Large multi-part request. Here's the scoped breakdown:

## 1. Reviews System (new)
- **DB**: `site_reviews` table (id, user_name, user_session_key, rating 1-5, message, created_at). Public INSERT allowed; SELECT denied for public, admin reads via service role.
- **DB**: `review_requests` table (id, session_key, requested_at, fulfilled bool) — admin sends a request to a specific online visitor.
- **Pop-up component**: Full-screen, non-dismissable modal with 5-star picker + textarea (min 20 chars). Blurs the page behind it (`backdrop-filter: blur`). Shows once per device (localStorage flag), only for accounts older than 20 minutes (check session `started_at`).
- **Triggers**: Auto-show globally if `reviews_enabled` flag is ON and account age ≥ 20 min and no prior review. In manual mode, only show when a `review_requests` row exists for current `session_key`.
- **Admin panel**: New "Reviews" sub-tab in developer options listing reviews (user name + text + rating + timestamp). New "Auto / Manual" toggle for the reviews feature. Small **Send Review Request** button next to each online visitor in the visitor log.

## 2. Featured Events Fixes
- **Bug fix**: Banner stops publishing after a few hours — root cause is the `loadActiveEvents` query filters by `ends_at` but not by `starts_at`, AND the cache TTL is fine; investigate whether signed URLs are expiring or the active query is being blocked by RLS. Add explicit `.eq("active", true)` + remove date filter that may exclude valid events; verify with a direct query.
- **Countdown timer**: Small countdown shown UNDER the banner image showing time until `starts_at` (admin sets the date/time in event form).
- **Flag mode**: Admin can pick "Flag VS Flag" event type — choose two countries from a custom LACZEK country picker (all world countries with flag emojis), set custom background color. No image upload needed for this mode.

## 3. Movie Download Button Fix
- Investigate `watch.$kind.$id.tsx` — the `downloadToDevice` helper requires a valid `url`; verify the download mirror URLs are being constructed for movies (not just episodes). Wire button correctly.

## 4. Vercel 404 Fix
- Current `vercel.json` uses `routes` rewriting everything to `/index.html` — but TanStack Start builds an SSR bundle, not an SPA. The `dist/` output for TanStack Start contains a server worker, not a static SPA. Vercel "static" deploy won't work for SSR routes. Fix: add proper Vercel adapter OR document that Vercel needs SSR mode. Easiest fix: configure `vercel.json` with `outputDirectory: "dist/client"` and proper SPA fallback for the client-only routes, OR switch to using Vercel Functions for SSR. I'll attempt a static-export config that points to the client bundle with a SPA fallback.

## 5. PWA Install Prompt
- Capture `beforeinstallprompt` event and show a small in-app install banner. Add a "Download" page section letting users choose **Install Web App (PWA)** or **Download APK** (links to APK build instructions/release).

## Files
- New: `supabase/migrations/...sql`, `src/components/ReviewPopup.tsx`, `src/components/admin/ReviewsPanel.tsx`, `src/components/CountryPicker.tsx`, `src/lib/reviews.functions.ts`, `src/lib/countries.ts`, `src/components/PwaInstallPrompt.tsx`
- Edit: `src/components/AdminPanel.tsx`, `src/components/FeaturedBanner.tsx`, `src/lib/admin.functions.ts`, `src/lib/feature-flags.ts`, `src/routes/__root.tsx`, `src/routes/watch.$kind.$id.tsx`, `vercel.json`, `public/manifest.json`

## Notes / Constraints
- Reviews popup being **non-dismissable** is enforced client-side only; a power user can bypass via devtools. Acceptable for the use case.
- Vercel SSR with TanStack Start needs the `@tanstack/react-start` Vercel preset; the current build targets Cloudflare Workers (`wrangler.jsonc`). Truly making Vercel work may require build config changes I'll attempt but cannot fully verify without a Vercel deploy. If full SSR doesn't work on Vercel, the publishable approach is the Lovable hosting or Cloudflare.
- This is a large change set; I'll ship in this single turn but it will create ~6 new files and edit ~8 existing files plus 1 migration.

Proceed?
