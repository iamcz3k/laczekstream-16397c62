import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cdnTime, normalizeCdnEvents } from "./football-cdn";

const now = Date.parse("2026-10-29T12:00:00Z");
const channel = { channel_name: "Sports HD", url: "https://cdnlivetv.tv/api/v1/channels/player/?name=Sports%20HD&user=cdnlivetv&plan=free" };
function event(gameID: string, status: string, start: string, end: string, channels = [channel]) {
  return { gameID, event: "Home vs Away", status, start, end, channels };
}
function feed(rows: unknown[]) { return { "cdn-live-tv": { Soccer: rows } }; }

describe("football live feed", () => {
  test("currently live matches come before upcoming games", () => {
    const rows = normalizeCdnEvents(feed([event("1", "NS", "2026-10-29 14:00", "2026-10-29 17:00"), event("2", "1H", "2026-10-29 11:30", "2026-10-29 14:30")]), now);
    assert.deepEqual(rows.map((r) => r.id), ["cdn-2", "cdn-1"]);
    assert.equal(rows[0]?.status, "live");
    assert.equal(new URL(rows[0]?.sources[0]?.embedUrl || "").searchParams.get("name"), "Sports HD");
  });
  test("finished and days-old matches are excluded", () => {
    assert.deepEqual(normalizeCdnEvents(feed([event("1", "FT", "2026-10-29 11:00", "2026-10-29 14:00"), event("2", "LIVE", "2026-10-26 11:00", "2026-10-26 14:00")]), now), []);
  });
  test("only starting-soon games within 24 hours are listed", () => {
    const rows = normalizeCdnEvents(feed([event("1", "NS", "2026-10-30 12:00", "2026-10-30 15:00"), event("2", "NS", "2026-10-30 12:01", "2026-10-30 15:01")]), now);
    assert.deepEqual(rows.map((r) => r.id), ["cdn-1"]);
  });
  test("scheduled status does not hide an active match in its time window", () => {
    const rows = normalizeCdnEvents(feed([event("1", "NS", "2026-10-29 11:00", "2026-10-29 14:00")]), now);
    assert.equal(rows[0]?.status, "live");
    assert.equal(cdnTime("2026-10-29 11:00"), Date.parse("2026-10-29T11:00:00Z"));
  });
  test("watch cards require safe player sources", () => {
    assert.deepEqual(normalizeCdnEvents(feed([event("1", "LIVE", "2026-10-29 11:00", "2026-10-29 14:00", []), event("2", "LIVE", "2026-10-29 11:00", "2026-10-29 14:00", [{ ...channel, url: "https://other.example/player" }])]), now), []);
  });
});