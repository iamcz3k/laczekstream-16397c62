import { describe, it, expect } from "vitest";
import { isBlockedAdUrl } from "@/lib/adblock";

describe("isBlockedAdUrl", () => {
  it("blocks known ad network hosts", () => {
    expect(isBlockedAdUrl("https://doubleclick.net/ad")).toBe(true);
    expect(isBlockedAdUrl("https://www.googlesyndication.com/pagead")).toBe(true);
    expect(isBlockedAdUrl("https://cdn.adnxs.com/script.js")).toBe(true);
    expect(isBlockedAdUrl("https://popads.net/pop")).toBe(true);
    expect(isBlockedAdUrl("https://track.propellerads.com/click")).toBe(true);
    expect(isBlockedAdUrl("https://exoclick.com/banner")).toBe(true);
    expect(isBlockedAdUrl("https://taboola.com/widget")).toBe(true);
    expect(isBlockedAdUrl("https://outbrain.com/feed")).toBe(true);
    expect(isBlockedAdUrl("https://criteo.com/rta")).toBe(true);
  });

  it("blocks subdomain variants of ad hosts", () => {
    expect(isBlockedAdUrl("https://ad.doubleclick.net/something")).toBe(true);
    expect(isBlockedAdUrl("https://pagead2.googlesyndication.com/pagead")).toBe(true);
    expect(isBlockedAdUrl("https://static.media.net/track")).toBe(true);
  });

  it("blocks URLs with ad path patterns", () => {
    expect(isBlockedAdUrl("https://example.com/ads/banner.js")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/ad/popup")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/popunder/script.js")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/popup/new")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/banner/300x250")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/vast?id=123")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/click.php")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/redirect.php")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/track.php")).toBe(true);
  });

  it("blocks URLs with ad query parameters", () => {
    expect(isBlockedAdUrl("https://example.com/page?ad=1")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/page?ads=true")).toBe(true);
    expect(isBlockedAdUrl("https://example.com/page?popup=yes")).toBe(true);
  });

  it("allows normal URLs that are not ads", () => {
    expect(isBlockedAdUrl("https://example.com")).toBe(false);
    expect(isBlockedAdUrl("https://youtube.com/watch?v=abc123")).toBe(false);
    expect(isBlockedAdUrl("https://google.com/search?q=hello")).toBe(false);
    expect(isBlockedAdUrl("https://laczekstream.local/movies")).toBe(false);
    expect(isBlockedAdUrl("https://github.com/user/repo")).toBe(false);
  });

  it("handles invalid URLs gracefully", () => {
    expect(isBlockedAdUrl("")).toBe(false);
    expect(isBlockedAdUrl("not-a-url")).toBe(false);
  });
});
