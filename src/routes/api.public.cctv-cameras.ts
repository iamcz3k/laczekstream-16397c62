import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

type Camera = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  info?: string;
  url: string;
  thumbnail?: string;
  isIframe?: boolean;
  isStreaming?: boolean;
};

// Curated free YouTube live CCTV streams (sourced from github.com/uzura89/webcam24)
const YT_CAMERAS: { yt: string; desc: string; spot: string; region: string; country: string; cat?: "city" | "nature" }[] = [
  { yt: 'ydYDqZQpim8', desc: 'Waterhole in the Namib Desert', spot: 'Namib Desert Waterhole', region: 'Namib Desert', country: 'Namibia', cat: 'nature' },
  { yt: '2E22geZeZDA', desc: 'Times Square in New York', spot: 'Times Square', region: 'New York', country: 'USA', cat: 'city' },
  { yt: 'Lfl2Nj_QRXU', desc: 'Shibuya Scramble Crossing', spot: 'Shibuya Scramble Crossing', region: 'Tokyo', country: 'Japan', cat: 'city' },
  { yt: 'gFRtAAmiFbE', desc: 'Shinjuku Kabukicho', spot: 'Shinjuku Kabukicho', region: 'Tokyo', country: 'Japan', cat: 'city' },
  { yt: 'F0GOOP82094', desc: 'Danish Forest', spot: 'Danish Forest', region: 'Denmark', country: 'Denmark', cat: 'nature' },
  { yt: 'TfOOzM6mPT4', desc: 'Sukhumvit Road', spot: 'Sukhumvit Road', region: 'Bangkok', country: 'Thailand', cat: 'city' },
  { yt: 'h1wly909BYw', desc: 'Nevsky Avenue', spot: 'Nevsky Avenue', region: 'St. Petersburg', country: 'Russia', cat: 'city' },
  { yt: 'VR-x3HdhKLQ', desc: 'Koh Samui Hooters', spot: 'Koh Samui Hooters', region: 'Koh Samui', country: 'Thailand', cat: 'city' },
  { yt: 'P9C25Un7xaM', desc: 'International Space Station', spot: 'International Space Station', region: 'Space', country: 'Space', cat: 'nature' },
  { yt: '3LXQWU67Ufk', desc: 'Venice Beach', spot: 'Venice Beach', region: 'Los Angeles', country: 'USA', cat: 'city' },
  { yt: 'rMRM_0t8rjU', desc: 'Eagle Nest', spot: 'Eagle Nest', region: 'Florida', country: 'USA', cat: 'nature' },
  { yt: '39uYW98qOV0', desc: 'Waterhole at Ol Donyo Lodge', spot: 'Chyulu Hills Waterhole', region: 'Ol Donyo Lodge', country: 'Kenya', cat: 'nature' },
  { yt: 'q0XCGZVzvWk', desc: 'Heathrow Airport', spot: 'Heathrow Airport', region: 'London', country: 'UK', cat: 'city' },
  { yt: 'a0i1Kg6fROg', desc: 'Northern Lights', spot: 'Northern Lights Churchill', region: 'Churchill', country: 'Canada', cat: 'nature' },
  { yt: 'O8xVFhgEv6Q', desc: 'Waterhole at Ol Jogi', spot: 'Ol Jogi Waterhole', region: 'Ol Jogi', country: 'Kenya', cat: 'nature' },
  { yt: 'yfSyjwY6zSQ', desc: 'Gorilla Forest Corridor in Kasugho', spot: 'Gorilla Forest Corridor', region: 'Kasugho', country: 'Congo', cat: 'nature' },
  { yt: 'O52zDyxg5QI', desc: 'Aurora in Fairbanks', spot: 'Aurora in Fairbanks', region: 'Fairbanks', country: 'USA', cat: 'nature' },
  { yt: 'P_zJwpM2g68', desc: 'Big Buddha Beach', spot: 'Big Buddha Beach', region: 'Koh Samui', country: 'Thailand', cat: 'city' },
  { yt: '6F1ABQXtCmI', desc: 'Port Huron', spot: 'Port Huron', region: 'Michigan', country: 'USA', cat: 'city' },
  { yt: '6dp-bvQ7RWo', desc: 'Shinjuku Crossings', spot: 'Shinjuku Crossings', region: 'Tokyo', country: 'Japan', cat: 'city' },
  { yt: 'ovLS4Ah4fcM', desc: 'Upper East Side', spot: 'Manhattan Upper East Side', region: 'New York', country: 'USA', cat: 'city' },
  { yt: 'PyNuRpZOtAY', desc: 'Bicycle Crossing Amsterdam', spot: 'Bicycle Crossing Amsterdam', region: 'Amsterdam', country: 'Netherlands', cat: 'city' },
];

function youtubeCameras(): Camera[] {
  return YT_CAMERAS.map((c) => ({
    id: `yt-${c.yt}`,
    name: c.spot,
    city: c.region,
    country: c.country,
    info: c.desc,
    // autoplay + mute required for browsers; playsinline + modest branding
    url: `https://www.youtube.com/embed/${c.yt}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`,
    thumbnail: `https://i.ytimg.com/vi/${c.yt}/hqdefault.jpg`,
    isIframe: true,
    isStreaming: false,
  }));
}

export const Route = createFileRoute("/api/public/cctv-cameras")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        const cameras = youtubeCameras();
        return Response.json(
          { cameras, source: "webcam24-youtube" },
          { headers: { ...CORS_HEADERS, "cache-control": "public, max-age=3600" } },
        );
      },
    },
  },
});
