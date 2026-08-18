import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return <AuthShell title="Mulai loyalty journey" description="Daftar singkat, lalu Card 1 langsung siap digunakan."><RegisterForm /></AuthShell>;
}
