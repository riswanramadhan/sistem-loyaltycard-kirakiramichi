import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyOtpForm } from "@/components/auth/verify-otp-form";

export const metadata: Metadata = {
  title: "Verifikasi OTP",
  robots: { index: false, follow: false },
};

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const parsed = z.object({
    email: z.string().trim().email(),
    mode: z.enum(["signup", "admin"]),
  }).safeParse(params);

  if (!parsed.success) redirect("/auth/login");

  return (
    <AuthShell
      title="Cek email kamu"
      description="Masukkan enam digit kode OTP untuk melanjutkan dengan aman."
    >
      <VerifyOtpForm email={parsed.data.email} mode={parsed.data.mode} />
    </AuthShell>
  );
}
