import { describe, it, expect, beforeEach, vi } from "vitest";
import { getPrefs, setPrefs, onPrefsChange } from "@/lib/preferences";

describe("preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getPrefs", () => {
    it("returns empty object when nothing stored", () => {
      expect(getPrefs()).toEqual({});
    });

    it("returns stored preferences", () => {
      localStorage.setItem("laczek:prefs", JSON.stringify({ name: "Alice", theme: "dark" }));
      const prefs = getPrefs();
      expect(prefs.name).toBe("Alice");
      expect(prefs.theme).toBe("dark");
    });

    it("returns empty object for corrupted data", () => {
      localStorage.setItem("laczek:prefs", "invalid-json{{{");
      expect(getPrefs()).toEqual({});
    });
  });

  describe("setPrefs", () => {
    it("stores preferences in localStorage", () => {
      setPrefs({ name: "Bob" });
      const stored = JSON.parse(localStorage.getItem("laczek:prefs")!);
      expect(stored.name).toBe("Bob");
    });

    it("merges with existing preferences", () => {
      setPrefs({ name: "Charlie" });
      setPrefs({ theme: "light" });
      const prefs = getPrefs();
      expect(prefs.name).toBe("Charlie");
      expect(prefs.theme).toBe("light");
    });

    it("dispatches custom event on change", () => {
      const handler = vi.fn();
      window.addEventListener("laczek:prefs-changed", handler);
      setPrefs({ name: "Dave" });
      expect(handler).toHaveBeenCalledTimes(1);
      window.removeEventListener("laczek:prefs-changed", handler);
    });
  });

  describe("onPrefsChange", () => {
    it("calls callback when prefs change", () => {
      const cb = vi.fn();
      const unsub = onPrefsChange(cb);
      setPrefs({ name: "Eve" });
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ name: "Eve" }));
      unsub();
    });

    it("unsubscribe stops callbacks", () => {
      const cb = vi.fn();
      const unsub = onPrefsChange(cb);
      unsub();
      setPrefs({ name: "Frank" });
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
