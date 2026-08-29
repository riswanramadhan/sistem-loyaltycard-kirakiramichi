export const EMAIL_OTP_LENGTH = 8;
export const EMAIL_OTP_EXPIRY_SECONDS = 5 * 60;
export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;

export function isEmailOtpExpired(sentAt: number, now = Date.now()) {
  if (!Number.isFinite(sentAt) || sentAt <= 0 || sentAt > now + 5 * 60 * 1000) {
    return false;
  }

  return now - sentAt >= EMAIL_OTP_EXPIRY_SECONDS * 1000;
}
