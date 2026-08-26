import type { Metadata } from "next";
import { AdminLinkLoginForm } from "@/components/auth/admin-link-login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Login Admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <AuthShell
      title="Okaeri, admin-san"
      description="Masuk ke workspace admin dengan kode OTP delapan digit yang dikirim ke email."
    >
      <AdminLinkLoginForm />
    </AuthShell>
  );
}
