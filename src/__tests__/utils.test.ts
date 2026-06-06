import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name merge utility)", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles conditional classes", () => {
    const shouldHide = false;
    expect(cn("base", shouldHide && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty string input", () => {
    expect(cn("", "foo")).toBe("foo");
  });

  it("merges conflicting tailwind utilities", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-white", "bg-black")).toBe("bg-black");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });
});
