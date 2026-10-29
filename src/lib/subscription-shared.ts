// Plan catalogue + shared helpers for the subscription system.
// Kept out of *.functions.ts so server-function modules stay import-only.

export type PlanId = "free" | "noads" | "allaccess";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  tagline: string;
  features: string[];
  perks: PerkKey[];
  highlight?: boolean;
};

export type PerkKey = "ad_free" | "downloads" | "translated" | "party" | "priority";

export const WHATSAPP_NUMBER = "256704232796";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceValue: 0,
    period: "forever",
    tagline: "Everything that is already free stays free",
    features: [
      "Unlimited movies and TV series",
      "Anime library",
      "Live football and sports fixtures",
      "Live TV channels worldwide",
      "LiveScore, lineups and match statistics",
      "Radio stations and podcasts",
      "Free-to-play games",
      "Search, filters, genres and recommendations",
      "Watchlist, viewing history and Continue Watching",
      "Personal preferences and language selection",
      "Surprise Me and library export",
      "Chrome extension and app installation",
    ],
    perks: [],
  },
  {
    id: "noads",
    name: "No Ads",
    price: "$2",
    priceValue: 2,
    period: "per month",
    tagline: "Clean viewing plus free downloads",
    features: [
      "Every Free feature listed above",
      "No ads anywhere on the site",
      "Download movies, series and anime",
      "Pause and resume downloads",
      "Offline playback without internet",
      "Downloads library and storage controls",
    ],
    perks: ["ad_free", "downloads"],
  },
  {
    id: "allaccess",
    name: "All Access",
    price: "$4.99",
    priceValue: 4.99,
    period: "per month · all features",
    tagline: "Unlocks every feature including translated movies",
    features: [
      "Every Free and No Ads feature listed above",
      "Ugandan translated movies and series",
      "VJ Junior, Jingo, Kevo, Ice P, Emmy and more",
      "Translated categories, search and new releases",
      "Create and join Watch Party rooms",
      "Watch Party invite links and live chat",
      "Priority customer support",
      "Early access to new features",
      "Use on up to 3 devices",
    ],
    perks: ["ad_free", "downloads", "translated", "party", "priority"],
    highlight: true,
  },
];

export const PERK_LABELS: Record<PerkKey, string> = {
  ad_free: "Ad-free viewing",
  downloads: "Free downloads",
  translated: "Translated movies (UG)",
  party: "Watch Party",
  priority: "Priority support",
};

export function planPerks(plan: PlanId): PerkKey[] {
  return PLANS.find((p) => p.id === plan)?.perks ?? [];
}

export function planName(plan: string): string {
  return PLANS.find((p) => p.id === plan)?.name ?? plan;
}

export function whatsappLink(plan: Plan) {
  const text = `Hello LACZEK STREAM, I want the ${plan.name} subscription (${plan.price} ${plan.period}). Please send me my activation code.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const MAX_DEVICES_DEFAULT = 3;
