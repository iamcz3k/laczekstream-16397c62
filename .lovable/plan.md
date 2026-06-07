# Plan: Live Viewers Fix + User Accounts

## Part 1 — Fix Live Viewers (Overview & Activity Log)

**Root cause:** `visitor_sessions` heartbeat updates aren't pushing to admin panel because realtime isn't enabled on the table, and the admin panel polls instead of subscribing.

**Changes:**
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;` and same for `site_reviews`.
- In `AdminPanel.tsx`: add a `useEffect` channel subscription on `visitor_sessions` + `site_reviews` that invalidates the queries on any change, plus a 10s polling fallback.
- Verify `tracker.ts` is actually calling the public client insert/update (not the failing server fn) so the heartbeat lands in DB.

## Part 2 — User Accounts (Email + Username + Full Name)

**Auth approach:** Use Supabase email/password auth with `auto_confirm_email: true` (no verification email). Username + full name stored in a `profiles` table.

**Database (one migration):**
- `profiles` table:
  - `id uuid PK references auth.users on delete cascade`
  - `email text not null`
  - `username text unique not null` (validated 5+ chars)
  - `full_name text not null` (validated as "First Last", 2+ words)
  - `is_blocked boolean default false`
  - `blocked_at timestamptz`, `blocked_reason text`
  - `created_at`, `updated_at`
- `app_role` enum (`admin`, `user`) + `user_roles` table + `has_role()` security definer function (per security rules — roles NEVER on profiles table).
- Trigger `on_auth_user_created` → inserts row into `profiles` from `raw_user_meta_data` (username, full_name).
- RLS: users read/update own profile; admins read/update all. Block check via `has_role`.
- GRANTs to `authenticated` + `service_role`.
- Link `visitor_sessions.user_id` (nullable) to associate sessions with logged-in users.

**Frontend:**
- New `AuthPopup.tsx` — full-screen modal shown on first visit if not authenticated. Toggle Sign In / Sign Up. Sign-up fields: email, username (min 5, alphanumeric+underscore), full name (must contain space, two words). Uses `supabase.auth.signUp` with `data: { username, full_name }` in metadata, no email redirect.
- Show in `__root.tsx` after onboarding completes, before main app, blocking interaction until signed in.
- After login, if `profiles.is_blocked`, show "Your account is blocked" screen with reason and sign-out button.
- Update `tracker.ts` to include `user_id` from current session.

**Admin Panel additions (new "Users" tab in `AdminPanel.tsx`):**
- List all profiles: username, full name, email, created, blocked status, last seen (joined from visitor_sessions).
- Search by username/email.
- Block/Unblock button per user (with reason input).
- View user's activity: sessions, paths, searches, watched (filtered visitor_sessions by user_id).
- Promote/demote admin role.
- Server fns in `src/lib/users.functions.ts` using `requireSupabaseAuth` + admin check, with `supabaseAdmin` for the actual queries (imported inside handlers).

**Auth config:** Call `supabase--configure_auth` with `auto_confirm_email: true`, `disable_signup: false`.

**First admin:** After migration, instruct user to sign up, then I'll insert a `user_roles` admin row for their account via the insert tool.

## Technical Notes

- All server fns that touch service role import `client.server` inside the `.handler()` to avoid client bundle leak.
- `attachSupabaseAuth` already wired in `start.ts` — verify.
- Username uniqueness enforced by DB unique constraint; surfaced as a friendly error in the form.
- No email verification means the email field is effectively unverified — acceptable per user's explicit request.
- Realtime subscriptions cleaned up in effect return.

## Files Touched (estimate)

- New migration (profiles + roles + realtime publication)
- New: `src/components/AuthPopup.tsx`, `src/components/BlockedScreen.tsx`, `src/lib/users.functions.ts`, `src/lib/auth.ts` (helper hook)
- Edited: `src/routes/__root.tsx`, `src/components/AdminPanel.tsx`, `src/lib/tracker.ts`, `src/lib/admin.functions.ts`

Shall I proceed?
