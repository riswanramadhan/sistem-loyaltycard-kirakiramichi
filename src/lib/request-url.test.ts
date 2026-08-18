import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "./env";
import { resolveAuthRedirectOrigin } from "./request-url";

describe("normalizeSiteUrl", () => {
  it("normalizes a canonical HTTPS origin", () => {
    expect(normalizeSiteUrl("https://loyalty.example.com/", true)).toBe(
      "https://loyalty.example.com",
    );
  });

  it.each([
    "http://loyalty.example.com",
    "javascript:alert(1)",
    "https://user:secret@loyalty.example.com",
    "https://loyalty.example.com/path",
  ])("rejects an unsafe production site URL: %s", (value) => {
    expect(() => normalizeSiteUrl(value, true)).toThrow();
  });

  it("allows loopback HTTP for local production builds", () => {
    expect(normalizeSiteUrl("http://localhost:3000", true)).toBe(
      "http://localhost:3000",
    );
  });
});

describe("resolveAuthRedirectOrigin", () => {
  it("prefers a configured canonical origin", () => {
    expect(
      resolveAuthRedirectOrigin({
        configuredOrigin: "https://loyalty.example.com",
        requestOrigin: "https://preview.example.com",
        requestHost: "preview.example.com",
        production: true,
      }),
    ).toBe("https://loyalty.example.com");
  });

  it("accepts a matching HTTPS request origin", () => {
    expect(
      resolveAuthRedirectOrigin({
        requestOrigin: "https://loyalty.example.com",
        requestHost: "loyalty.example.com",
        production: true,
      }),
    ).toBe("https://loyalty.example.com");
  });

  it("normalizes a default HTTPS port in the request host", () => {
    expect(
      resolveAuthRedirectOrigin({
        requestOrigin: "https://loyalty.example.com",
        requestHost: "loyalty.example.com:443",
        production: true,
      }),
    ).toBe("https://loyalty.example.com");
  });

  it("rejects a host-header mismatch", () => {
    expect(() =>
      resolveAuthRedirectOrigin({
        requestOrigin: "https://evil.example",
        requestHost: "loyalty.example.com",
        production: true,
      }),
    ).toThrow();
  });

  it("does not silently use localhost in production", () => {
    expect(() => resolveAuthRedirectOrigin({ production: true })).toThrow();
  });

  it("keeps the local development fallback", () => {
    expect(resolveAuthRedirectOrigin({ production: false })).toBe(
      "http://localhost:3000",
    );
  });
});
