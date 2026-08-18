import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return <AuthShell title="Buat password baru" description="Gunakan minimal 8 karakter yang sulit ditebak."><UpdatePasswordForm /></AuthShell>;
}
