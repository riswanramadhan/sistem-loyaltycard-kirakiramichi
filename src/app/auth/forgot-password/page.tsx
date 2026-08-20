import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return <AuthShell title="Reset password" description="Kami akan mengirim link reset ke email akunmu."><ForgotPasswordForm /></AuthShell>;
}
