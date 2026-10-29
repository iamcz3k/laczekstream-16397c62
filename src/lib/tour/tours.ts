// Tour registry — scripted walkthroughs the user can launch from the menu.
// Each tour is a list of steps that point at a real DOM node via a CSS
// selector (preferred: `[data-tour="..."]`). When `route` is set, the engine
// navigates there before showing the step.

export type TourStep = {
  /** CSS selector for the highlighted element. Optional — a step with no
   * target is shown as a centered modal card (intro / outro). */
  target?: string;
  title: string;
  body: string;
  /** Navigate to this route before showing the step. */
  route?: string;
  /** Wait this many ms after navigation/scroll before measuring the target. */
  delay?: number;
};

export type Tour = {
  id: string;
  label: string;
  steps: TourStep[];
};

// Shared home-tab tour — touches every visible tab in the header, the search,
// the Surprise Me button and the More menu, then sends the user to Watch.
export const HOME_TOUR: Tour = {
  id: "home",
  label: "Tour the whole site",
  steps: [
    {
      title: "Welcome to LACZEK STREAM",
      body: "Let me show you around — every tab, the menu, and how to watch. Tap Next to continue, or Skip any time.",
    },
    {
      target: '[data-tour="tab-movies"]',
      title: "Movies tab",
      body: "Browse trending and top-rated movies here. Tap any poster to start watching — no signup, no ads.",
      route: "/",
    },
    {
      target: '[data-tour="tab-tv"]',
      title: "TV shows",
      body: "All series, with seasons and episodes. Pick a show, then a season, then an episode.",
    },
    {
      target: '[data-tour="tab-football"]',
      title: "Live Sports",
      body: "Live football, basketball, tennis and more. Live matches stream right inside the page.",
    },
    {
      target: '[data-tour="tab-radio"]',
      title: "Radio",
      body: "Thousands of free radio stations. Filter by country and genre.",
    },
    {
      target: '[data-tour="tab-podcasts"]',
      title: "Podcasts",
      body: "Search any podcast, hit play, done. Episodes stream straight from the publisher.",
    },
    {
      target: '[data-tour="surprise-me"]',
      title: "Surprise Me",
      body: "Can't pick? Tap this and we'll throw a random great movie at you.",
    },
    {
      target: '[data-tour="more-menu"]',
      title: "The menu",
      body: "Library, Downloads, Watch Party, Speed Test, language and more live in here.",
    },
    {
      title: "Watch page next",
      body: "I'll open a movie now so I can show you the player controls.",
    },
  ],
};

// Watch-page tour — assumes the user is already on /watch/...
export const WATCH_TOUR: Tour = {
  id: "watch",
  label: "How the player works",
  steps: [
    {
      title: "You're on the Watch page",
      body: "This is where the streaming happens. Let me point out the important controls.",
    },
    {
      target: '[data-tour="server-switch"]',
      title: "Switch server",
      body: "If a stream is slow or down, tap a different server here. The first one is usually fastest.",
    },
    {
      target: '[data-tour="next-episode"]',
      title: "Next episode",
      body: "For series — tap this to jump straight to the next episode without scrolling.",
    },
    {
      target: '[data-tour="download-button"]',
      title: "Download",
      body: "Save it offline. Downloads pause and resume — great for travel.",
    },
    {
      title: "Player tips",
      body: "Double-tap the video for fullscreen, swipe to seek on mobile, and press F on desktop. That's it — enjoy!",
    },
  ],
};

// Per-route mini tours
export const DOWNLOADS_TOUR: Tour = {
  id: "downloads",
  label: "Downloads",
  steps: [
    { route: "/downloads", title: "Downloads", body: "Everything you've saved offline lives here. Files pause and resume automatically." },
    { target: '[data-tour="storage-meter"]', title: "Storage", body: "Track how much device space your downloads use. Delete one to free space." },
  ],
};

export const RADIO_TOUR: Tour = {
  id: "radio",
  label: "Radio",
  steps: [
    { route: "/radio", title: "Radio", body: "Search by country or genre — tap any station to start streaming live." },
  ],
};

export const PODCASTS_TOUR: Tour = {
  id: "podcasts",
  label: "Podcasts",
  steps: [
    { route: "/podcasts", title: "Podcasts", body: "Search by show or topic, open a podcast, then play any episode." },
  ],
};

export const PARTY_TOUR: Tour = {
  id: "party",
  label: "Watch Party",
  steps: [
    { route: "/party", title: "Watch Party", body: "Create a room and share the link. Everyone's player stays in sync." },
  ],
};

export const SPEEDTEST_TOUR: Tour = {
  id: "speedtest",
  label: "Speed test",
  steps: [
    { route: "/speedtest", title: "Speed test", body: "Quick check of your download speed so you know which server to pick." },
  ],
};

// Lookup — used by the engine when launching a tour by id or by current route.
export const TOURS: Record<string, Tour> = {
  home: HOME_TOUR,
  watch: WATCH_TOUR,
  downloads: DOWNLOADS_TOUR,
  radio: RADIO_TOUR,
  podcasts: PODCASTS_TOUR,
  party: PARTY_TOUR,
  speedtest: SPEEDTEST_TOUR,
};

/** Pick a sensible tour to launch from the current path. */
export function tourForPath(pathname: string): Tour {
  if (pathname.startsWith("/watch")) return WATCH_TOUR;
  if (pathname.startsWith("/downloads")) return DOWNLOADS_TOUR;
  if (pathname.startsWith("/radio")) return RADIO_TOUR;
  if (pathname.startsWith("/podcasts")) return PODCASTS_TOUR;
  if (pathname.startsWith("/party")) return PARTY_TOUR;
  if (pathname.startsWith("/speedtest")) return SPEEDTEST_TOUR;
  return HOME_TOUR;
}
