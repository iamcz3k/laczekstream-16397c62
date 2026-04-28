import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

const WE4CITY_BASE_URL = process.env.WE4CITY_BASE_URL;
const WE4CITY_ACCESS_TOKEN = process.env.WE4CITY_ACCESS_TOKEN;
const OPEN_TRAFFIC_CAMERAS = "https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/master/cameras/USA.json";

type Camera = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  info?: string;
  url: string;
  isIframe?: boolean;
  isStreaming?: boolean;
  latitude?: number;
  longitude?: number;
};

async function fetchWe4cityCameras(): Promise<Camera[]> {
  if (!WE4CITY_BASE_URL || !WE4CITY_ACCESS_TOKEN) return [];
  const endpoint = `${WE4CITY_BASE_URL.replace(/\/$/, "")}/api/v1/public/Cameras/Live/all`;
  const res = await fetch(endpoint, { headers: { authorization: `Bearer ${WE4CITY_ACCESS_TOKEN}`, accept: "application/json" } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.ret?.cameras ?? [])
    .filter((camera: any) => camera?.url && /^https?:\/\//i.test(camera.url))
    .map((camera: any) => ({
      id: String(camera.id ?? camera.cod ?? camera.url),
      name: camera.descr || camera.cod || "Live CCTV Camera",
      city: "We4city",
      country: "Public",
      info: camera.info,
      url: camera.url,
      isIframe: Boolean(Number(camera.isIframe)),
      isStreaming: Boolean(Number(camera.isStreaming)),
    }));
}

async function fetchOpenTrafficCameras(): Promise<Camera[]> {
  const res = await fetch(OPEN_TRAFFIC_CAMERAS, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  const cameras: Camera[] = [];
  for (const [state, cities] of Object.entries(data as Record<string, Record<string, any[]>>)) {
    for (const [city, list] of Object.entries(cities ?? {})) {
      for (const camera of list ?? []) {
        if (!camera?.url || !/^https?:\/\//i.test(camera.url)) continue;
        cameras.push({
          id: `${state}-${city}-${camera.description}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 120),
          name: camera.description || `${city} traffic camera`,
          city,
          country: "United States",
          info: `${state}${camera.direction ? ` · ${camera.direction}` : ""}`,
          url: camera.url,
          isStreaming: /m3u8|mpd|stream|playlist/i.test(camera.url),
          latitude: camera.latitude,
          longitude: camera.longitude,
        });
      }
    }
  }
  return cameras.slice(0, 800);
}

export const Route = createFileRoute("/api/public/cctv-cameras")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () => {
        const [we4city, fallback] = await Promise.all([fetchWe4cityCameras(), fetchOpenTrafficCameras()]);
        const seen = new Set<string>();
        const cameras = [...we4city, ...fallback].filter((camera) => {
          if (seen.has(camera.url)) return false;
          seen.add(camera.url);
          return true;
        });
        return Response.json({ cameras, source: we4city.length ? "we4city" : "open-traffic-cam-map" }, { headers: { ...CORS_HEADERS, "cache-control": "public, max-age=3600" } });
      },
    },
  },
});