// Client-side entitlement store. The activation code is validated on the server
// (3 devices per code); the result is cached here so the UI can unlock instantly.
import { useEffect, useState } from "react";
import { planPerks, type PerkKey, type PlanId } from "@/lib/subscription-shared";

const KEY = "laczek:sub";
const DEVICE_KEY = "laczek:device-id";
const EVENT = "laczek:sub-changed";

export type Entitlement = {
  plan: PlanId;
  code?: string;
  expiresAt?: string | null;
  activatedAt?: string;
};

const FREE: Entitlement = { plan: "free" };

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getDeviceId(): string {
  if (!isBrowser()) return "server";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function deviceLabel(): string {
  if (!isBrowser()) return "server";
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : "Web";
  return `${os} browser`;
}

export function getEntitlement(): Entitlement {
  if (!isBrowser()) return FREE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return FREE;
    const ent = JSON.parse(raw) as Entitlement;
    if (ent.expiresAt && new Date(ent.expiresAt).getTime() < Date.now()) return FREE;
    return ent;
  } catch {
    return FREE;
  }
}

export function setEntitlement(ent: Entitlement) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(ent));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: ent }));
}

export function clearEntitlement() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: FREE }));
}

export function hasPerk(perk: PerkKey, ent: Entitlement = getEntitlement()) {
  return planPerks(ent.plan).includes(perk);
}

export function daysLeft(ent: Entitlement = getEntitlement()): number | null {
  if (!ent.expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(ent.expiresAt).getTime() - Date.now()) / 86400000));
}

export function useEntitlement() {
  const [ent, setEnt] = useState<Entitlement>(FREE);
  useEffect(() => {
    setEnt(getEntitlement());
    const handler = () => setEnt(getEntitlement());
    window.addEventListener(EVENT, handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("focus", handler);
    };
  }, []);
  return ent;
}

export function usePerk(perk: PerkKey) {
  const ent = useEntitlement();
  return planPerks(ent.plan).includes(perk);
}

/** Open the subscription sheet from anywhere. */
export function openPaywall(reason?: PerkKey) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("laczek:paywall", { detail: { reason } }));
}
