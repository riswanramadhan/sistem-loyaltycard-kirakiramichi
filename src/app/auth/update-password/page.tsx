import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UpdatePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/forgot-password");

  return <AuthShell title="Buat password baru" description="Gunakan minimal 8 karakter yang sulit ditebak."><UpdatePasswordForm /></AuthShell>;
}
