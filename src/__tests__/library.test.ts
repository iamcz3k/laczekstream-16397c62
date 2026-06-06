import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getContinueWatching,
  getWatchlist,
  getHistory,
  recordWatch,
  removeFromContinue,
  toggleWatchlist,
  isInWatchlist,
  clearLibrary,
  exportLibrary,
} from "@/lib/library";

describe("library", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const movieEntry = {
    id: 1,
    kind: "movie" as const,
    title: "Test Movie",
    poster: "/poster.jpg",
    year: "2024",
    rating: 8.5,
  };

  const tvEntry = {
    id: 2,
    kind: "tv" as const,
    title: "Test Show",
    season: 1,
    episode: 3,
  };

  describe("recordWatch", () => {
    it("adds entry to history", () => {
      recordWatch(movieEntry);
      const history = getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe("Test Movie");
    });

    it("adds entry to continue watching when not finished", () => {
      recordWatch({ ...movieEntry, position: 100, duration: 7200 });
      expect(getContinueWatching()).toHaveLength(1);
    });

    it("removes from continue watching when > 95% complete", () => {
      recordWatch({ ...movieEntry, position: 6900, duration: 7200 });
      expect(getContinueWatching()).toHaveLength(0);
    });

    it("updates existing entry instead of duplicating", () => {
      recordWatch(movieEntry);
      recordWatch(movieEntry);
      expect(getHistory()).toHaveLength(1);
    });
  });

  describe("watchlist", () => {
    it("toggleWatchlist adds an entry", () => {
      const result = toggleWatchlist(movieEntry);
      expect(result).toBe(true);
      expect(getWatchlist()).toHaveLength(1);
    });

    it("toggleWatchlist removes an existing entry", () => {
      toggleWatchlist(movieEntry);
      const result = toggleWatchlist(movieEntry);
      expect(result).toBe(false);
      expect(getWatchlist()).toHaveLength(0);
    });

    it("isInWatchlist returns correct state", () => {
      expect(isInWatchlist(movieEntry)).toBe(false);
      toggleWatchlist(movieEntry);
      expect(isInWatchlist(movieEntry)).toBe(true);
    });
  });

  describe("removeFromContinue", () => {
    it("removes a specific entry from continue watching", () => {
      recordWatch({ ...movieEntry, position: 50, duration: 7200 });
      recordWatch({ ...tvEntry, position: 50, duration: 3600 });
      expect(getContinueWatching()).toHaveLength(2);
      removeFromContinue(movieEntry);
      const remaining = getContinueWatching();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe("Test Show");
    });
  });

  describe("clearLibrary", () => {
    it("clears a specific store", () => {
      recordWatch(movieEntry);
      toggleWatchlist(tvEntry);
      clearLibrary("history");
      expect(getHistory()).toHaveLength(0);
      expect(getWatchlist()).toHaveLength(1);
    });

    it("clears all stores", () => {
      recordWatch(movieEntry);
      toggleWatchlist(tvEntry);
      clearLibrary("all");
      expect(getHistory()).toHaveLength(0);
      expect(getWatchlist()).toHaveLength(0);
      expect(getContinueWatching()).toHaveLength(0);
    });
  });

  describe("exportLibrary", () => {
    it("exports all data as JSON string", () => {
      recordWatch(movieEntry);
      toggleWatchlist(tvEntry);
      const exported = exportLibrary();
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty("continue");
      expect(parsed).toHaveProperty("watchlist");
      expect(parsed).toHaveProperty("history");
      expect(parsed).toHaveProperty("exportedAt");
      expect(parsed.history).toHaveLength(1);
      expect(parsed.watchlist).toHaveLength(1);
    });
  });

  describe("sorting", () => {
    it("returns entries sorted by most recent first", () => {
      const now = Date.now();
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now - 1000)
        .mockReturnValueOnce(now);
      recordWatch(movieEntry);
      recordWatch(tvEntry);
      const history = getHistory();
      expect(history[0].title).toBe("Test Show");
      expect(history[1].title).toBe("Test Movie");
    });
  });

  describe("edge cases", () => {
    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem("laczek:history", "not-json");
      expect(getHistory()).toEqual([]);
    });

    it("handles non-array localStorage data", () => {
      localStorage.setItem("laczek:history", JSON.stringify({ foo: "bar" }));
      expect(getHistory()).toEqual([]);
    });

    it("filters entries without numeric id", () => {
      localStorage.setItem(
        "laczek:history",
        JSON.stringify([{ id: "abc", kind: "movie", title: "Bad" }, movieEntry]),
      );
      // Only entries with numeric id should pass
      const history = getHistory();
      // The raw read filters, but we record fresh for updatedAt
      expect(history.every((e) => typeof e.id === "number")).toBe(true);
    });
  });
});
