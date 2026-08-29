"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { whatsappSchema } from "@/app/auth/validation";
import { friendlyAuthMessage } from "@/lib/auth/auth-errors";
import { EMAIL_OTP_LENGTH, isEmailOtpExpired } from "@/lib/auth/otp";
import { safeReturnPath } from "@/lib/navigation";
import { getAuthRedirectOrigin } from "@/lib/request-url";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string>;
};

const emailSchema = z.string().trim().email("Masukkan alamat email yang valid.").max(254);
const passwordSchema = z.string().min(8, "Password minimal 8 karakter.").max(72);
const dateOfBirthSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Masukkan tanggal lahir yang valid.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= new Date().toISOString().slice(0, 10);
}, "Tanggal lahir tidak boleh berada di masa depan.");
const PROGRAM_SLUG = "kira-kira-michi-loyalty";
const otpPattern = new RegExp(`^\\d{${EMAIL_OTP_LENGTH}}$`);

function values(formData: FormData, names: string[]) {
  return Object.fromEntries(names.map((name) => [name, String(formData.get(name) ?? "")])) as Record<string, string>;
}

function friendlyLoyaltySetupError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("date_of_birth_required")) {
    return "Tanggal lahir belum tersimpan. Lengkapi data profile lalu buka kembali loyalty card.";
  }
  if (normalized.includes("terms_acceptance_required")) {
    return "Persetujuan syarat dan ketentuan belum tersimpan. Lengkapi pendaftaran lalu coba lagi.";
  }
  if (normalized.includes("active_loyalty_program_not_found")) {
    return "Program loyalty sedang tidak aktif. Hubungi admin Kira Kira Michi.";
  }
  if (normalized.includes("seven_active_card_definitions")) {
    return "Konfigurasi tujuh card loyalty belum lengkap. Hubungi admin untuk melengkapi program.";
  }
  if (normalized.includes("customer_role_required")) {
    return "Akun ini bukan customer. Gunakan halaman login admin untuk masuk ke workspace.";
  }
  return "Kartu loyalty belum dapat disiapkan saat ini. Sesi kamu tetap aman; coba buka kembali beberapa saat lagi.";
}

async function ensureCustomerLoyalty(
  supabase: Awaited<ReturnType<typeof createClient>>,
) : Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: joinError } = await supabase.rpc("join_loyalty_program", {
    p_program_slug: PROGRAM_SLUG,
  });

  if (joinError) {
    console.error("[auth:loyalty-join]", joinError.message);
    return { ok: false, message: friendlyLoyaltySetupError(joinError.message) };
  }

  // `join_loyalty_program` is a single database transaction: on success it
  // creates/reuses the membership and completes all seven cards. Do not make
  // login depend on a second aggregate read, because a transient read/cache
  // delay used to sign valid users back out immediately after authentication.
  return { ok: true };
}

export async function loginAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const fields = values(formData, ["email", "next"]);
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Masukkan password.") })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message, fields };
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !signInData.user) {
    return { status: "error", message: friendlyAuthMessage(error?.message, "login"), fields };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth:login-profile]", profileError.message);
    return {
      status: "error",
      message: "Akun berhasil diverifikasi, tetapi profil belum dapat dibaca. Coba lagi beberapa saat lagi.",
      fields,
    };
  }

  if (profile?.role === "admin") {
    revalidatePath("/", "layout");
    redirect("/admin");
  }

  if (profile && profile.role !== "customer") {
    return { status: "error", message: "Jenis akun belum dikenali. Hubungi admin Kira Kira Michi.", fields };
  }

  const returnPath = safeReturnPath(formData.get("next"));
  const setup = await ensureCustomerLoyalty(supabase);
  if (!setup.ok) {
    return { status: "error", message: setup.message, fields };
  }

  revalidatePath("/", "layout");
  redirect(returnPath === "/join" || returnPath.startsWith("/loyalty") ? returnPath : "/loyalty");
}

export async function registerAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const fields = values(formData, ["fullName", "email", "whatsapp", "dateOfBirth"]);
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(100),
      email: emailSchema,
      whatsapp: whatsappSchema,
      dateOfBirth: dateOfBirthSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
      termsAccepted: z.boolean().refine((value) => value, "Kamu wajib menyetujui syarat dan ketentuan untuk mendaftar."),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: "Konfirmasi password belum sama.",
    })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      whatsapp: formData.get("whatsapp"),
      dateOfBirth: formData.get("dateOfBirth"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      termsAccepted: formData.get("termsAccepted") === "on",
    });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message, fields };
  }

  let origin: string;
  try {
    origin = await getAuthRedirectOrigin();
  } catch {
    console.error("Auth redirect origin is not configured safely.");
    return {
      status: "error",
      message: "Verifikasi email belum dikonfigurasi untuk domain production. Hubungi tim Kira Kira Michi.",
      fields,
    };
  }

  const supabase = await createClient();
  let signUpResult;
  try {
    signUpResult = await supabase.auth.signUp({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=/loyalty`,
        data: {
          full_name: parsed.data.fullName,
          whatsapp: parsed.data.whatsapp,
          date_of_birth: parsed.data.dateOfBirth,
          terms_accepted: true,
          terms_version: "2026-08-30",
          marketing_consent: false,
        },
      },
    });
  } catch (error) {
    console.error("[auth:register-request]", error instanceof Error ? error.message : "unknown error");
    return {
      status: "error",
      message: "Koneksi ke layanan pendaftaran terputus. Periksa internet lalu coba kembali.",
      fields,
    };
  }

  const { data, error } = signUpResult;

  if (error) return { status: "error", message: friendlyAuthMessage(error.message, "register"), fields };

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { status: "error", message: "Email ini sudah terdaftar. Silakan masuk.", fields };
  }

  if (data.session) {
    const setup = await ensureCustomerLoyalty(supabase);
    if (!setup.ok) {
      return {
        status: "error",
        message: setup.message,
        fields,
      };
    }
    redirect("/loyalty");
  }

  redirect(`/auth/verify-otp?mode=signup&email=${encodeURIComponent(parsed.data.email.toLowerCase())}&sentAt=${Date.now()}`);
}

export async function forgotPasswordAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  let origin: string;
  try {
    origin = await getAuthRedirectOrigin();
  } catch {
    console.error("Password recovery redirect origin is not configured safely.");
    return {
      status: "error",
      message: "Reset password belum dikonfigurasi untuk domain production. Hubungi tim Kira Kira Michi.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });
  if (error) return { status: "error", message: friendlyAuthMessage(error.message, "password") };

  return {
    status: "success",
    message: "Link reset password sudah dikirim. Buka email kamu lalu klik link tersebut.",
  };
}

export async function requestAdminLoginOtpAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  let origin: string;
  try {
    origin = await getAuthRedirectOrigin();
  } catch {
    console.error("Admin auth redirect origin is not configured safely.");
    return {
      status: "error",
      message: "Login admin belum siap. Hubungi pengelola Kira Kira Michi.",
    };
  }

  const email = parsed.data.toLowerCase();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/confirm?next=/admin`,
    },
  });

  if (error) return { status: "error", message: friendlyAuthMessage(error.message, "otp") };
  redirect(`/auth/verify-otp?mode=admin&email=${encodeURIComponent(email)}&sentAt=${Date.now()}`);
}

export async function verifyEmailOtpAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z.object({
    email: emailSchema,
    token: z.string().trim().regex(otpPattern, `Masukkan ${EMAIL_OTP_LENGTH} digit kode OTP dari email.`),
    mode: z.enum(["signup", "admin"]),
    sentAt: z.coerce.number().int().positive().optional(),
  }).safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    mode: formData.get("mode"),
    sentAt: formData.get("sentAt") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  if (parsed.data.sentAt && isEmailOtpExpired(parsed.data.sentAt)) {
    return {
      status: "error",
      message: "Kode OTP sudah melewati masa berlaku 5 menit. Minta kode baru untuk melanjutkan.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email.toLowerCase(),
    token: parsed.data.token,
    type: "email",
  });

  if (error || !data.user) {
    return { status: "error", message: friendlyAuthMessage(error?.message, "otp") };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { status: "error", message: "Profil akun belum tersedia. Silakan coba masuk kembali." };
  }

  if (parsed.data.mode === "admin") {
    if (profile.role !== "admin") {
      await supabase.auth.signOut();
      return { status: "error", message: "Akun ini tidak memiliki akses admin." };
    }

    revalidatePath("/", "layout");
    redirect("/admin");
  }

  if (profile.role !== "customer") {
    await supabase.auth.signOut();
    return { status: "error", message: "Akun admin harus masuk melalui halaman login admin." };
  }

  const setup = await ensureCustomerLoyalty(supabase);
  if (!setup.ok) {
    return {
      status: "error",
      message: setup.message,
    };
  }

  revalidatePath("/", "layout");
  redirect("/loyalty");
}

export async function resendEmailOtpAction(
  previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z.object({
    email: emailSchema,
    mode: z.enum(["signup", "admin"]),
  }).safeParse({ email: formData.get("email"), mode: formData.get("mode") });

  if (!parsed.success) {
    return { status: "error", message: "Alamat email atau jenis OTP tidak valid.", fields: previous.fields };
  }

  let origin: string;
  try {
    origin = await getAuthRedirectOrigin();
  } catch {
    return { status: "error", message: "Domain verifikasi belum dikonfigurasi.", fields: previous.fields };
  }

  const email = parsed.data.email.toLowerCase();
  const supabase = await createClient();
  const result = parsed.data.mode === "signup"
    ? await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${origin}/auth/confirm?next=/loyalty` },
      })
    : await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${origin}/auth/confirm?next=/admin`,
        },
      });

  if (result.error) {
    return {
      status: "error",
      message: friendlyAuthMessage(result.error.message, "otp"),
      fields: previous.fields,
    };
  }

  return {
    status: "success",
    message: `Kode OTP ${EMAIL_OTP_LENGTH} digit yang baru sudah dikirim. Kode berlaku 5 menit.`,
    fields: { sentAt: String(Date.now()) },
  };
}

export async function updatePasswordAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password: passwordSchema, confirmPassword: z.string() })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Konfirmasi password belum sama.",
    })
    .safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });

  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: friendlyAuthMessage(error.message, "password") };

  return { status: "success", message: "Password berhasil diperbarui." };
}
