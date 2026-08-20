"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { whatsappSchema } from "@/app/auth/validation";
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
function values(formData: FormData, names: string[]) {
  return Object.fromEntries(names.map((name) => [name, String(formData.get(name) ?? "")])) as Record<string, string>;
}

function friendlyAuthMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("invalid login")) return "Email atau password belum tepat.";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) return "Email ini sudah terdaftar. Silakan masuk.";
  if (normalized.includes("password")) return "Password belum memenuhi ketentuan keamanan.";
  if (normalized.includes("rate limit")) return "Terlalu banyak percobaan. Coba lagi beberapa saat ya.";
  if (normalized.includes("expired")) return "Tautan autentikasi sudah kedaluwarsa. Minta tautan baru ya.";
  if (normalized.includes("otp") || normalized.includes("token")) return "Tautan autentikasi tidak valid atau sudah digunakan.";
  return "Proses belum berhasil. Coba lagi sebentar ya.";
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
  if (error) return { status: "error", message: friendlyAuthMessage(error.message), fields };

  const returnPath = safeReturnPath(formData.get("next"));
  if (returnPath === "/join" || returnPath.startsWith("/loyalty")) {
    const { error: joinError } = await supabase.rpc("join_loyalty_program", {
      p_program_slug: "kira-kira-michi-loyalty",
    });
    if (joinError) console.error("Membership initialization failed", joinError.message);
  }

  revalidatePath("/", "layout");
  redirect(returnPath);
}

export async function registerAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const fields = values(formData, ["fullName", "email", "whatsapp"]);
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(100),
      email: emailSchema,
      whatsapp: whatsappSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
      marketingConsent: z.boolean(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: "Konfirmasi password belum sama.",
    })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      whatsapp: formData.get("whatsapp"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      marketingConsent: formData.get("marketingConsent") === "on",
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
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/loyalty`,
      data: {
        full_name: parsed.data.fullName,
        whatsapp: parsed.data.whatsapp,
        marketing_consent: parsed.data.marketingConsent,
      },
    },
  });

  if (error) return { status: "error", message: friendlyAuthMessage(error.message), fields };

  if (data.session) {
    const { error: joinError } = await supabase.rpc("join_loyalty_program", {
      p_program_slug: "kira-kira-michi-loyalty",
    });
    if (joinError) {
      return { status: "error", message: "Akun berhasil dibuat, tetapi loyalty belum bisa dibuka. Coba masuk kembali ya.", fields };
    }
    redirect("/loyalty");
  }

  return {
    status: "success",
    message: "Link verifikasi sudah dikirim. Buka email kamu lalu klik link tersebut untuk mengaktifkan akun.",
    fields,
  };
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
  if (error) return { status: "error", message: friendlyAuthMessage(error.message) };

  return {
    status: "success",
    message: "Link reset password sudah dikirim. Buka email kamu lalu klik link tersebut.",
  };
}

export async function requestAdminLoginLinkAction(
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
      emailRedirectTo: `${origin}/auth/callback?next=/admin`,
    },
  });

  if (error) return { status: "error", message: friendlyAuthMessage(error.message) };
  return {
    status: "success",
    message: "Link login admin sudah dikirim. Buka email tersebut lalu klik link untuk masuk.",
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
  if (error) return { status: "error", message: friendlyAuthMessage(error.message) };

  return { status: "success", message: "Password berhasil diperbarui." };
}
