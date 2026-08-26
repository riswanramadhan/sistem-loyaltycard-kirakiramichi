import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { StatusMessage } from "@/components/ui/status-message";
import { safeReturnPath } from "@/lib/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string; error?: string }> }) {
  const params = await searchParams;
  const errorMessage = params.error === "admin-access"
    ? "Email ini tidak memiliki akses admin."
    : params.error === "callback"
      ? "Proses autentikasi tidak valid atau sudah kedaluwarsa. Silakan minta kode atau tautan baru."
      : null;

  return (
    <AuthShell title="Okaeri!" description="Masuk lagi buat lanjut jalan menuju reward-mu.">
      {params.notice === "verified" && <StatusMessage tone="success" className="mb-5">Email berhasil diverifikasi! Silakan masuk.</StatusMessage>}
      {params.notice === "check-email" && <StatusMessage tone="success" className="mb-5">Kode verifikasi sudah dikirim. Cek inbox email kamu.</StatusMessage>}
      {errorMessage && <StatusMessage tone="error" className="mb-5">{errorMessage}</StatusMessage>}
      <LoginForm next={safeReturnPath(params.next)} />
    </AuthShell>
  );
}
