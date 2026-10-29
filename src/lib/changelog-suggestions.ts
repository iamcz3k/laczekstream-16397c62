// Curated catalog of every feature, fix & improvement shipped on the site.
// The admin panel auto-loads these as one-tap "publish" suggestions and lets
// admin queue multiple updates to push as a batch. Add new entries to the TOP.

export type ChangelogSuggestion = {
  key: string; // stable id, never reuse
  kind: "new" | "fix" | "improved" | "soon";
  title: string;
  detail: string;
};

export const CHANGELOG_SUGGESTIONS: ChangelogSuggestion[] = [
  // ===== Latest =====
  {
    key: "livescore-fuzzy-2026-06b",
    kind: "fix",
    title: "LiveScore now works for every sport",
    detail:
      "Live scores, timeline and stats now load for WNBA, NBA, NFL, MLB, NHL, MMA, tennis and more — not just soccer. We fuzzy-match the teams in the match title so unknown match IDs still resolve.",
  },
  {
    key: "geo-server-2026-06",
    kind: "fix",
    title: "Country detection covers every country",
    detail:
      "Visitors from Uganda and other regions that third-party IP databases miss now show their real country in the admin Visitor Log, thanks to a server-side geo lookup that runs before the public IP APIs.",
  },
  {
    key: "events-inline-toggle-2026-06",
    kind: "improved",
    title: "One-tap show / hide for featured events",
    detail:
      "Admins can now flip a featured event between LIVE and OFF directly from the events list without opening the edit form. Changes propagate to visitors within 30 seconds.",
  },
  {
    key: "changelog-queue-2026-06",
    kind: "improved",
    title: "Batch publish updates",
    detail:
      "Admin can now queue multiple updates in the Fixes & Features panel and publish them all at once instead of one by one.",
  },
  {
    key: "changelog-suggestions-2026-06",
    kind: "improved",
    title: "Auto-loaded update suggestions",
    detail:
      "The Fixes & Features panel now auto-lists every feature & fix we've shipped, so publishing is one tap — no retyping.",
  },

  // ===== Smart TV / device =====
  {
    key: "tv-mode-2026-06",
    kind: "new",
    title: "Smart TV mode",
    detail:
      "Smart TVs, consoles and big-screen browsers automatically switch to a TV-friendly layout with bigger text, larger tap targets and a clear focus ring for remotes. Force it any time with ?tv=1.",
  },
  {
    key: "iphone-menu-fix-2026-06",
    kind: "fix",
    title: "iPhone menu now opens fully",
    detail:
      "Fixed the side menu on iPhone Safari — the bottom of the menu was getting cut off behind the browser bar. It now uses the full screen height and respects the safe area.",
  },

  // ===== What's new system =====
  {
    key: "fixes-feed-2026-06",
    kind: "new",
    title: "What's new popup",
    detail:
      "A dismissible popup now shows our latest updates the first time you visit after we ship something. Tap X or 'Got it' to close — you won't see the same update twice.",
  },

  // ===== Broadcast / reviews / questions =====
  {
    key: "broadcast-system-2026-06",
    kind: "new",
    title: "Live admin notifications",
    detail:
      "Admin can push site-wide notifications and questions straight to your screen, plus forced review prompts with a 5-star rating.",
  },
  {
    key: "review-min-chars-2026-06",
    kind: "improved",
    title: "Better review quality",
    detail:
      "Reviews now require at least 20 characters so we get real feedback instead of one-word answers.",
  },
  {
    key: "review-targeting-2026-06",
    kind: "new",
    title: "Targeted review requests",
    detail:
      "From the visitor log, admin can send a review prompt to a specific account. People who already left a review won't be asked again.",
  },
  {
    key: "broadcast-age-gate-2026-06",
    kind: "improved",
    title: "Quieter first 2 hours",
    detail:
      "Brand-new accounts won't get review popups for their first 2 hours so people can explore the site in peace before being asked for feedback.",
  },

  // ===== Admin panel =====
  {
    key: "admin-flicker-fix-2026-06",
    kind: "fix",
    title: "No more admin panel flicker",
    detail:
      "The admin panel no longer flashes a loading screen every time it refreshes data in the background.",
  },

  // ===== Streaming / movies / sports =====
  {
    key: "featured-events-banner",
    kind: "new",
    title: "Featured events banner",
    detail:
      "A live banner now spotlights the biggest matches and premieres with countdown timers and team flags right on the home screen.",
  },
  {
    key: "default-movie-server",
    kind: "improved",
    title: "Faster default movie server",
    detail:
      "We picked a faster default streaming source so movies start quicker. You can still switch servers from the player menu.",
  },
  {
    key: "match-chat",
    kind: "new",
    title: "Live match chat",
    detail:
      "Chat with other fans in real time while you're watching a football match.",
  },
  {
    key: "live-scores",
    kind: "new",
    title: "Live scores tab",
    detail:
      "Track live football scores across leagues without leaving the site.",
  },

  // ===== Downloads =====
  {
    key: "downloads-tab",
    kind: "new",
    title: "Downloads for offline viewing",
    detail:
      "Save movies and shows to your device and watch them offline from the Downloads tab.",
  },
  {
    key: "download-resume",
    kind: "improved",
    title: "Resumable downloads",
    detail:
      "Downloads now resume from where they stopped if your connection drops or you close the tab.",
  },

  // ===== Misc tabs =====
  {
    key: "anime-tab",
    kind: "new",
    title: "Anime tab",
    detail: "Stream subbed and dubbed anime with episode tracking.",
  },
  {
    key: "music-tab",
    kind: "new",
    title: "Music tab",
    detail: "Listen to music straight from the site.",
  },
  {
    key: "podcasts-tab",
    kind: "new",
    title: "Podcasts",
    detail: "Browse and play podcasts from your favourite shows.",
  },
  {
    key: "radio-tab",
    kind: "new",
    title: "Live radio",
    detail: "Tune into live radio stations from around the world.",
  },

  // ===== Quality of life =====
  {
    key: "watch-party",
    kind: "new",
    title: "Watch parties",
    detail:
      "Create a party room and watch movies in sync with friends — share the link and you're set.",
  },
  {
    key: "speedtest",
    kind: "new",
    title: "Built-in speed test",
    detail:
      "Test your connection speed without leaving the site so you know which quality to pick.",
  },
  {
    key: "library-sync",
    kind: "improved",
    title: "Library syncs across devices",
    detail:
      "Your saved titles now follow you between phone, TV and laptop automatically.",
  },
  {
    key: "bug-report",
    kind: "new",
    title: "One-tap bug report",
    detail:
      "Found something broken? Tap the bug-report button and tell us — we'll fix it fast.",
  },

  // ===== Soon =====
  {
    key: "soon-mobile-app",
    kind: "soon",
    title: "Native mobile app coming",
    detail:
      "We're building a proper Android and iOS app with offline downloads and push notifications. Stay tuned.",
  },
];
