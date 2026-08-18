import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { StatusMessage } from "@/components/ui/status-message";
import { safeReturnPath } from "@/lib/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; notice?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell title="Selamat datang lagi" description="Masuk untuk melihat stamp dan reward kamu.">
      {params.notice === "check-email" && <StatusMessage tone="success" className="mb-5">Cek email kamu untuk mengaktifkan akun, lalu masuk kembali.</StatusMessage>}
      {params.error === "callback" && <StatusMessage className="mb-5">Link autentikasi tidak valid atau sudah kedaluwarsa. Coba kirim ulang ya.</StatusMessage>}
      <LoginForm next={safeReturnPath(params.next)} />
    </AuthShell>
  );
}
