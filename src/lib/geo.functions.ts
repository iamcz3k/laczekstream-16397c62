// Server-side geo detection using request headers injected by the edge
// runtime (Cloudflare / Vercel). This works for every country including the
// ones third-party IP databases mis-flag (e.g. Uganda).
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/start-server-core";

const COUNTRY_NAMES: Record<string, string> = {
  UG: "Uganda", KE: "Kenya", TZ: "Tanzania", RW: "Rwanda", BI: "Burundi",
  SS: "South Sudan", ET: "Ethiopia", SO: "Somalia", SD: "Sudan", EG: "Egypt",
  NG: "Nigeria", GH: "Ghana", ZA: "South Africa", ZW: "Zimbabwe", ZM: "Zambia",
  MW: "Malawi", MZ: "Mozambique", AO: "Angola", CM: "Cameroon", CI: "Côte d'Ivoire",
  SN: "Senegal", ML: "Mali", BF: "Burkina Faso", NE: "Niger", TD: "Chad",
  DZ: "Algeria", MA: "Morocco", TN: "Tunisia", LY: "Libya",
  US: "United States", CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina",
  GB: "United Kingdom", IE: "Ireland", FR: "France", DE: "Germany", ES: "Spain",
  IT: "Italy", PT: "Portugal", NL: "Netherlands", BE: "Belgium", CH: "Switzerland",
  AT: "Austria", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland",
  PL: "Poland", CZ: "Czechia", RO: "Romania", GR: "Greece", TR: "Turkey",
  RU: "Russia", UA: "Ukraine", BY: "Belarus",
  CN: "China", JP: "Japan", KR: "South Korea", IN: "India", PK: "Pakistan",
  BD: "Bangladesh", ID: "Indonesia", MY: "Malaysia", SG: "Singapore", TH: "Thailand",
  VN: "Vietnam", PH: "Philippines", AU: "Australia", NZ: "New Zealand",
  AE: "United Arab Emirates", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait",
  IL: "Israel", JO: "Jordan", LB: "Lebanon", IR: "Iran", IQ: "Iraq",
};

export const getServerGeo = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const get = (n: string) => getRequestHeader(n as never) ?? null;
    const countryCode = get("cf-ipcountry") || get("x-vercel-ip-country") || get("x-country-code") || null;
    const cityRaw = get("cf-ipcity") || get("x-vercel-ip-city") || get("x-city") || null;
    const city = cityRaw ? (() => { try { return decodeURIComponent(cityRaw); } catch { return cityRaw; } })() : null;
    const ip = get("cf-connecting-ip") || get("x-real-ip") || (get("x-forwarded-for") || "").split(",")[0]?.trim() || null;
    const country = countryCode && COUNTRY_NAMES[countryCode.toUpperCase()] ? COUNTRY_NAMES[countryCode.toUpperCase()] : countryCode;
    return { country: country || null, city: city || null, ip: ip || null };
  } catch {
    return { country: null as string | null, city: null as string | null, ip: null as string | null };
  }
});
