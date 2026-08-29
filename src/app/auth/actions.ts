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

async function initializeCustomerLoyalty(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { error: joinError } = await supabase.rpc("join_loyalty_program", {
    p_program_slug: PROGRAM_SLUG,
  });

  if (joinError) {
    console.error("[auth:loyalty-join]", joinError.message);
    return false;
  }

  const { data, error } = await supabase.rpc("get_my_loyalty_state", {
    p_program_slug: PROGRAM_SLUG,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    console.error("[auth:loyalty-ready]", error?.message ?? "invalid loyalty state");
    return false;
  }

  const state = data as {
    profile?: { role?: unknown } | null;
    program?: { total_cards?: unknown } | null;
    member_program?: unknown;
    cards?: unknown;
  };
  const expectedCards = state.program?.total_cards;

  return state.profile?.role === "customer" &&
    Boolean(state.member_program) &&
    Array.isArray(state.cards) &&
    typeof expectedCards === "number" &&
    state.cards.length === expectedCards;
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: friendlyAuthMessage(error.message, "login"), fields };

  const returnPath = safeReturnPath(formData.get("next"));
  if (returnPath === "/join" || returnPath.startsWith("/loyalty")) {
    if (!await initializeCustomerLoyalty(supabase)) {
      await supabase.auth.signOut();
      return {
        status: "error",
        message: "Akun sudah benar, tetapi kartu loyalty belum dapat disiapkan. Coba masuk kembali; jika berulang, hubungi admin.",
        fields,
      };
    }
  }

  revalidatePath("/", "layout");
  redirect(returnPath);
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
    if (!await initializeCustomerLoyalty(supabase)) {
      return {
        status: "error",
        message: "Akun berhasil dibuat, tetapi kartu loyalty belum selesai disiapkan. Masuk kembali; sistem akan mencoba menyiapkannya lagi.",
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
      message: "Kode OTP sudah melewati masa berlaku 1 jam. Minta kode baru untuk melanjutkan.",
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

  if (!await initializeCustomerLoyalty(supabase)) {
    return {
      status: "error",
      message: "Email sudah terverifikasi, tetapi kartu loyalty belum selesai disiapkan. Silakan masuk; sistem akan mencoba menyiapkannya kembali.",
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
    message: `Kode OTP ${EMAIL_OTP_LENGTH} digit yang baru sudah dikirim. Kode berlaku 1 jam.`,
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
