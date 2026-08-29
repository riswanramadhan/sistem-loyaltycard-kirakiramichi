import { describe, expect, it } from "vitest";
import { friendlyAuthMessage } from "./auth-errors";
import {
  EMAIL_OTP_EXPIRY_SECONDS,
  EMAIL_OTP_LENGTH,
  isEmailOtpExpired,
} from "./otp";

describe("OTP auth contract", () => {
  it("uses the same eight-digit contract as the Supabase project", () => {
    expect(EMAIL_OTP_LENGTH).toBe(8);
    expect(EMAIL_OTP_EXPIRY_SECONDS).toBe(300);
  });

  it("only treats a challenge as expired after five minutes", () => {
    const sentAt = Date.UTC(2026, 7, 27, 10, 0, 0);
    expect(isEmailOtpExpired(sentAt, sentAt + 299_000)).toBe(false);
    expect(isEmailOtpExpired(sentAt, sentAt + 300_000)).toBe(true);
  });

  it("does not mislabel Supabase's combined invalid-token response as expired", () => {
    expect(
      friendlyAuthMessage("Token has expired or is invalid", "otp"),
    ).toContain("salah");
    expect(
      friendlyAuthMessage("Token has expired or is invalid", "otp"),
    ).not.toContain("kedaluwarsa");
  });

  it("reports a definite expiry separately", () => {
    expect(friendlyAuthMessage("OTP expired", "otp")).toContain("kedaluwarsa");
  });

  it("explains common registration failures", () => {
    expect(friendlyAuthMessage("User already registered", "register")).toContain("sudah terdaftar");
    expect(friendlyAuthMessage("Error sending confirmation email", "register")).toContain("SMTP");
    expect(friendlyAuthMessage("Database error saving new user", "register")).toContain("profil customer");
  });
});
