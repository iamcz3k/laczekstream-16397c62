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
  thumbnail?: string;
  isIframe?: boolean;
  isStreaming?: boolean;
  latitude?: number;
  longitude?: number;
};

function mapThumbnail(latitude?: number, longitude?: number) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return undefined;
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s-camera+ffb347(${longitude},${latitude})/${longitude},${latitude},12,0/640x360@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNrcmV5bzQ5azA1dDgycW10N2VqdmZsamMifQ.gE9I2uQImdzvx-f7T5UQHw`;
}

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
      thumbnail: /\.(jpe?g|png|webp)(\?|$)/i.test(camera.url) ? camera.url : undefined,
      isIframe: Boolean(Number(camera.isIframe)),
      isStreaming: Boolean(Number(camera.isStreaming)),
    }));
}

function classify(url: string): { isStreaming: boolean; isIframe: boolean; isImage: boolean } {
  const u = url.toLowerCase();
  const isStreaming = /\.m3u8|\.mpd|playlist|manifest|\/hls\//i.test(u);
  const isImage = !isStreaming && /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(u);
  const isIframe = !isStreaming && !isImage && (/\.(mjpg|mjpeg|cgi)(\?|$)/i.test(u) || /youtube\.com|youtu\.be|skylinewebcams|earthcam/i.test(u));
  return { isStreaming, isIframe, isImage };
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
        const { isStreaming, isIframe, isImage } = classify(camera.url);
        cameras.push({
          id: `${state}-${city}-${camera.description}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 120),
          name: camera.description || `${city} traffic camera`,
          city,
          country: "United States",
          info: `${state}${camera.direction ? ` · ${camera.direction}` : ""}`,
          url: camera.url,
          thumbnail: isImage ? camera.url : mapThumbnail(camera.latitude, camera.longitude),
          isStreaming,
          isIframe,
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