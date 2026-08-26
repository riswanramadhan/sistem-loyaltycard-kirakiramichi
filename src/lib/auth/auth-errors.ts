export type AuthErrorContext =
  | "generic"
  | "login"
  | "register"
  | "otp"
  | "password";

export function friendlyAuthMessage(
  message?: string,
  context: AuthErrorContext = "generic",
) {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("invalid login")) {
    return "Email atau password belum tepat.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email belum diverifikasi. Buka email kamu atau minta kode OTP baru.";
  }
  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already exists")
  ) {
    return "Email ini sudah terdaftar. Silakan masuk atau gunakan lupa password.";
  }
  if (normalized.includes("signup") && normalized.includes("disabled")) {
    return "Pendaftaran akun sedang dinonaktifkan di Supabase. Hubungi admin Kira Kira Michi.";
  }
  if (normalized.includes("invalid email") || normalized.includes("email address is invalid")) {
    return "Alamat email tidak valid. Periksa penulisan email lalu coba lagi.";
  }
  if (
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit")
  ) {
    return "Email terlalu sering dikirim. Tunggu sekitar 60 detik lalu coba kembali.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba kembali.";
  }
  if (
    normalized.includes("error sending confirmation email") ||
    normalized.includes("smtp") ||
    normalized.includes("email provider") ||
    normalized.includes("failed to send")
  ) {
    return "Akun belum selesai dibuat karena email OTP gagal dikirim. Periksa SMTP Supabase lalu coba kembali.";
  }
  if (
    normalized.includes("database error saving new user") ||
    normalized.includes("error saving new user")
  ) {
    return "Akun belum berhasil dibuat karena profil customer gagal disimpan di database. Hubungi admin untuk memeriksa migration Supabase.";
  }
  if (normalized.includes("captcha")) {
    return "Pemeriksaan keamanan belum lolos. Muat ulang halaman lalu coba kembali.";
  }
  if (
    normalized.includes("weak_password") ||
    normalized.includes("password should") ||
    normalized.includes("password is too")
  ) {
    return "Password belum memenuhi ketentuan keamanan. Gunakan minimal 8 karakter dengan kombinasi huruf, angka, dan simbol.";
  }
  if (
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("timeout")
  ) {
    return "Koneksi ke layanan akun terputus. Periksa internet lalu coba kembali.";
  }

  if (context === "otp") {
    // Supabase dapat menggabungkan token salah dan token kedaluwarsa dalam satu
    // pesan. Masa berlaku diperiksa terpisah memakai waktu pengiriman OTP.
    if (
      normalized.includes("token has expired or is invalid") ||
      normalized.includes("invalid token") ||
      normalized.includes("invalid otp")
    ) {
      return "Kode OTP salah atau tidak cocok dengan email. Periksa seluruh digit lalu coba lagi.";
    }
    if (normalized.includes("expired")) {
      return "Kode OTP sudah kedaluwarsa. Minta kode baru untuk melanjutkan.";
    }
    if (normalized.includes("otp") || normalized.includes("token")) {
      return "Kode OTP salah atau tidak cocok dengan email. Periksa seluruh digit lalu coba lagi.";
    }
    return "Kode OTP belum dapat diverifikasi. Periksa kodenya lalu coba kembali.";
  }

  if (normalized.includes("expired")) {
    return "Tautan atau kode sudah kedaluwarsa. Minta yang baru lalu coba kembali.";
  }
  if (normalized.includes("password")) {
    return "Password belum memenuhi ketentuan keamanan.";
  }
  if (context === "register") {
    return "Akun belum berhasil dibuat. Coba lagi; jika berulang, hubungi admin dengan waktu kejadian agar log Supabase dapat diperiksa.";
  }
  if (context === "password") {
    return "Password belum berhasil diperbarui. Coba kembali dari sesi reset password terbaru.";
  }
  return "Proses belum berhasil. Coba lagi sebentar ya.";
}
