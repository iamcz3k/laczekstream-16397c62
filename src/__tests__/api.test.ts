import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to test cleanAnimeTitle and mapTmdb which are not directly exported.
// We'll test through the exported functions that use them, or test the public API behavior.
// For mapTmdb, we test via tmdbTrending/tmdbPopular with mocked fetch.

import {
  tmdbTrending,
  tmdbPopular,
  tmdbSearch,
  tmdbMultiSearch,
  animePosterFallback,
} from "@/lib/api";

describe("api - TMDB functions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockTmdbMovie = {
    id: 123,
    title: "Test Movie",
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    release_date: "2024-03-15",
    overview: "A test movie",
    vote_average: 7.5,
    media_type: "movie",
  };

  const mockTmdbTv = {
    id: 456,
    name: "Test Show",
    poster_path: "/show.jpg",
    backdrop_path: null,
    first_air_date: "2023-01-01",
    overview: "A test show",
    vote_average: 8.2,
    media_type: "tv",
  };

  describe("tmdbTrending", () => {
    it("maps TMDB response to MediaItem array", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ results: [mockTmdbMovie] }),
        }),
      );

      const items = await tmdbTrending("movie");
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 123,
        title: "Test Movie",
        poster: "https://image.tmdb.org/t/p/w500/poster.jpg",
        backdrop: "https://image.tmdb.org/t/p/w780/backdrop.jpg",
        year: "2024",
        type: "movie",
        rating: 7.5,
      });
    });

    it("throws on failed request", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

      await expect(tmdbTrending("movie")).rejects.toThrow("tmdb trending failed");
    });
  });

  describe("tmdbPopular", () => {
    it("maps TV results correctly", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ results: [mockTmdbTv] }),
        }),
      );

      const items = await tmdbPopular("tv");
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 456,
        title: "Test Show",
        year: "2023",
        type: "tv",
        backdrop: undefined,
      });
    });
  });

  describe("tmdbSearch", () => {
    it("searches and maps results", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ results: [mockTmdbMovie] }),
        }),
      );

      const items = await tmdbSearch("movie", "test");
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Test Movie");
    });

    it("throws on failed search", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

      await expect(tmdbSearch("movie", "test")).rejects.toThrow("tmdb search failed");
    });
  });

  describe("tmdbMultiSearch", () => {
    it("categorizes results into movies, tv, and people", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                mockTmdbMovie,
                mockTmdbTv,
                {
                  media_type: "person",
                  id: 789,
                  name: "John Doe",
                  profile_path: "/john.jpg",
                  known_for: [{ title: "Movie A" }, { name: "Show B" }],
                },
              ],
            }),
        }),
      );

      const result = await tmdbMultiSearch("test");
      expect(result.movies).toHaveLength(1);
      expect(result.tv).toHaveLength(1);
      expect(result.people).toHaveLength(1);
      expect(result.people[0]).toMatchObject({
        id: 789,
        name: "John Doe",
        profile: "https://image.tmdb.org/t/p/w500/john.jpg",
        knownFor: "Movie A, Show B",
      });
    });

    it("returns empty results for empty query", async () => {
      const result = await tmdbMultiSearch("");
      expect(result).toEqual({ movies: [], tv: [], people: [] });
    });

    it("returns empty results on failed request", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

      const result = await tmdbMultiSearch("test");
      expect(result).toEqual({ movies: [], tv: [], people: [] });
    });
  });

  describe("animePosterFallback", () => {
    it("fetches poster from Jikan API", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  images: {
                    webp: { large_image_url: "https://cdn.jikan.moe/poster.webp" },
                    jpg: { large_image_url: "https://cdn.jikan.moe/poster.jpg" },
                  },
                },
              ],
            }),
        }),
      );

      const poster = await animePosterFallback("Naruto");
      expect(poster).toBe("https://cdn.jikan.moe/poster.webp");
    });

    it("returns empty string for empty title", async () => {
      const poster = await animePosterFallback("");
      expect(poster).toBe("");
    });

    it("returns empty string on failed request", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

      const poster = await animePosterFallback("UniqueFailTitle");
      expect(poster).toBe("");
    });

    it("cleans subtitle indonesia from title before searching", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ images: { webp: { large_image_url: "https://cdn.jikan.moe/p.webp" } } }],
          }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await animePosterFallback("Bleach Subtitle Indonesia");
      // cleanAnimeTitle strips "subtitle indonesia" and lowercases
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("bleach"));
      expect(mockFetch).toHaveBeenCalledWith(expect.not.stringContaining("indonesia"));
    });
  });
});
