import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./navigation";

describe("safeReturnPath", () => {
  it("allows an internal application path", () => {
    expect(safeReturnPath("/loyalty/rewards?from=join")).toBe(
      "/loyalty/rewards?from=join",
    );
  });

  it.each([
    "https://example.com",
    "//example.com",
    "/\\evil.com",
    "/%5c%5cevil.com",
    "/%2f%2fevil.com",
    "/%252f%252fevil.com",
    "/.//evil.com",
    "/%2e%2e//evil.com",
    "/loyalty?next=%2f%2fevil.com",
    "/loyalty%00",
    "javascript:alert(1)",
    "/auth",
    "/auth/callback",
    "/%61uth/callback",
    "/%2561uth/callback",
    null,
  ])("rejects an unsafe return URL: %s", (value) => {
    expect(safeReturnPath(value)).toBe("/loyalty");
  });
});
