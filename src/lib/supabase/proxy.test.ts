import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { copyResponseCookies } from "./proxy";

describe("copyResponseCookies", () => {
  it("preserves refreshed session cookies on a redirect response", () => {
    const sessionResponse = NextResponse.next();
    sessionResponse.cookies.set({
      name: "sb-session",
      value: "rotated-token",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
    const redirectResponse = NextResponse.redirect(
      "https://loyalty.example.com/loyalty",
    );

    const result = copyResponseCookies(sessionResponse, redirectResponse);

    expect(result.cookies.get("sb-session")).toMatchObject({
      value: "rotated-token",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
  });
});
