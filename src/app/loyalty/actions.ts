"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type LoyaltyActionResult = {
  ok: boolean;
  message: string;
};

function friendlyRequestError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("pending") || normalized.includes("unresolved")) {
    return "Request sebelumnya masih diperiksa. Tunggu kabarnya dulu, ya.";
  }
  if (
    normalized.includes("remaining") ||
    normalized.includes("capacity") ||
    normalized.includes("exceed") ||
    normalized.includes("overshoot")
  ) {
    return "Jumlah stamp melebihi slot yang tersisa di card ini.";
  }
  if (normalized.includes("active") || normalized.includes("locked")) {
    return "Card ini belum bisa menerima request stamp.";
  }
  if (
    normalized.includes("permission") ||
    normalized.includes("authorized") ||
    normalized.includes("auth") ||
    normalized.includes("belong")
  ) {
    return "Sesi atau card kamu sudah berubah. Muat ulang lalu coba lagi.";
  }

  return "Request belum berhasil dikirim. Coba lagi sebentar, ya.";
}

export async function requestStampAction(input: {
  memberCardId: string;
  requestedCount: number;
  customerNote?: string;
}): Promise<LoyaltyActionResult> {
  await requireUser();

  const memberCardId = input.memberCardId?.trim();
  const requestedCount = Number(input.requestedCount);
  const customerNote = input.customerNote?.trim() || null;

  if (!memberCardId || !/^[0-9a-f-]{36}$/i.test(memberCardId)) {
    return { ok: false, message: "Card loyalty tidak valid. Muat ulang halaman ini." };
  }
  if (requestedCount !== 1 && requestedCount !== 2) {
    return { ok: false, message: "Pilih 1 atau 2 stamp." };
  }
  if (customerNote && customerNote.length > 280) {
    return { ok: false, message: "Catatan maksimal 280 karakter." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_stamps", {
    p_member_card_id: memberCardId,
    p_requested_count: requestedCount,
    p_customer_note: customerNote,
  });

  if (error) {
    return { ok: false, message: friendlyRequestError(error.message) };
  }

  revalidatePath("/loyalty");
  revalidatePath("/loyalty/history");
  return {
    ok: true,
    message:
      "Stamp request sent! Lagi dicek sama Kira Kira Michi. Stamp kamu akan masuk setelah dikonfirmasi.",
  };
}

export async function updateProfileAction(input: {
  fullName: string;
  whatsapp: string;
  marketingConsent: boolean;
}): Promise<LoyaltyActionResult> {
  await requireUser();

  const fullName = input.fullName?.trim().replace(/\s+/g, " ");
  const whatsapp = input.whatsapp?.trim() || null;

  if (!fullName || fullName.length < 2 || fullName.length > 80) {
    return { ok: false, message: "Nama lengkap harus berisi 2–80 karakter." };
  }
  if (
    whatsapp &&
    (whatsapp.length < 5 || whatsapp.length > 30 || !/^[0-9+(). -]+$/.test(whatsapp))
  ) {
    return { ok: false, message: "Nomor WhatsApp belum sesuai. Gunakan angka dan kode negara." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_profile", {
    p_full_name: fullName,
    p_whatsapp: whatsapp,
    p_marketing_consent: Boolean(input.marketingConsent),
  });

  if (error) {
    return { ok: false, message: "Profil belum berhasil disimpan. Coba lagi sebentar, ya." };
  }

  revalidatePath("/loyalty", "layout");
  return { ok: true, message: "Profil kamu sudah diperbarui." };
}

export async function changePasswordAction(input: {
  password: string;
  confirmation: string;
}): Promise<LoyaltyActionResult> {
  await requireUser();

  if (input.password.length < 8 || input.password.length > 72) {
    return { ok: false, message: "Password baru harus berisi 8–72 karakter." };
  }
  if (input.password !== input.confirmation) {
    return { ok: false, message: "Konfirmasi password belum sama." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: input.password });

  if (error) {
    return { ok: false, message: "Password belum berhasil diubah. Coba lagi sebentar, ya." };
  }

  return { ok: true, message: "Password sudah diubah dengan aman." };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
