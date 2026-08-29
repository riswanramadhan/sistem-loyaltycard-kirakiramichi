"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { friendlyAuthMessage } from "@/lib/auth/auth-errors";
import { getAuthRedirectOrigin } from "@/lib/request-url";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const uuidSchema = z.string().uuid();
const optionalNoteSchema = z
  .string()
  .trim()
  .max(500, "Catatan maksimal 500 karakter.")
  .optional()
  .transform((value) => value || null);

function safeFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function friendlyMutationError(context: string, error: { message?: string; code?: string }) {
  console.error(`[admin:${context}]`, {
    code: error.code,
    message: error.message,
  });

  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("pending_stamp_request_exists")) {
    return "Selesaikan request stamp yang masih pending sebelum melakukan penyesuaian manual.";
  }
  if (message.includes("customer_not_found")) {
    return "Customer sudah tidak ditemukan. Kembali ke daftar customer lalu muat data terbaru.";
  }
  if (message.includes("only_customer_accounts_can_be_deleted")) {
    return "Akun admin tidak dapat dihapus dari menu customer.";
  }
  if (message.includes("admin_cannot_delete_self")) {
    return "Admin tidak dapat menghapus akunnya sendiri dari menu customer.";
  }
  if (message.includes("completed_card_reward_not_available_for_reversal")) {
    return "Completion tidak dapat dibuka ulang karena reward sudah ditebus atau tidak lagi tersedia.";
  }
  if (
    message.includes("next_member_card_has_progress") ||
    message.includes("next_member_card_has_activity")
  ) {
    return "Completion tidak dapat dibuka ulang karena kartu berikutnya sudah memiliki progres atau riwayat aktivitas.";
  }
  if (message.includes("adjustment_exceeds_stamp_bounds")) {
    return "Penyesuaian akan membuat jumlah stamp di luar batas 0–6.";
  }
  if (message.includes("already") || message.includes("sudah")) {
    return "Aksi ini sudah diproses sebelumnya. Data terbaru sudah dimuat.";
  }
  if (message.includes("pending")) {
    return "Request ini sudah tidak berstatus pending. Muat ulang lalu periksa kembali.";
  }
  if (message.includes("capacity") || message.includes("overshoot") || message.includes("maximum")) {
    return "Jumlah stamp melewati kapasitas kartu. Periksa progres terbaru customer.";
  }
  if (message.includes("active")) {
    return "Penyesuaian hanya dapat dilakukan pada kartu yang sedang aktif.";
  }
  if (message.includes("redeem")) {
    return "Reward ini sudah ditebus atau belum tersedia.";
  }
  if (message.includes("expired") || message.includes("kedaluwarsa")) {
    return "Reward ini sudah melewati masa berlaku dan tidak dapat ditebus.";
  }
  if (message.includes("downstream") || message.includes("reversal")) {
    return "Penyelesaian kartu tidak dapat dibalik karena kartu berikutnya sudah memiliki aktivitas atau reward sudah ditebus.";
  }
  if (message.includes("permission") || message.includes("admin") || error.code === "42501") {
    return "Sesi admin tidak memiliki izin untuk aksi ini. Silakan masuk kembali.";
  }

  return "Aksi belum berhasil disimpan. Periksa data terbaru lalu coba lagi.";
}

function success(message: string): AdminActionState {
  return { status: "success", message };
}

function failure(message: string): AdminActionState {
  return { status: "error", message };
}

export async function createAdminAccountAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = z.object({
    fullName: z.string().trim().min(2, "Nama admin minimal 2 karakter.").max(100),
    email: z.string().trim().email("Email admin belum valid.").max(254),
  }).safeParse({
    fullName: safeFormText(formData, "fullName"),
    email: safeFormText(formData, "email").toLowerCase(),
  });

  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Data admin belum valid.");

  const supabase = await createClient();
  const { error: invitationError } = await supabase.rpc("admin_create_email_invitation", {
    p_email: parsed.data.email,
    p_full_name: parsed.data.fullName,
  });

  if (invitationError) {
    console.error("[admin:invite-admin-rpc]", { code: invitationError.code, message: invitationError.message });
    if (invitationError.code === "PGRST202") {
      return failure("Migration undangan admin belum diterapkan. Jalankan SQL migration terbaru di Supabase lalu coba lagi.");
    }
    return failure(friendlyMutationError("invite-admin", invitationError));
  }

  let origin: string;
  try {
    origin = await getAuthRedirectOrigin();
  } catch {
    return failure("Domain autentikasi belum dikonfigurasi dengan aman.");
  }

  const { error: emailError } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/confirm?next=/admin`,
      data: {
        full_name: parsed.data.fullName,
        account_type: "admin_invite",
      },
    },
  });

  if (emailError) {
    console.error("[admin:invite-admin-email]", { message: emailError.message });
    return failure(`Akses admin sudah disiapkan, tetapi email OTP belum terkirim. ${friendlyAuthMessage(emailError.message, "otp")}`);
  }

  revalidatePath("/admin/admins");
  return success(`Undangan dan OTP admin berhasil dikirim ke ${parsed.data.email}. Kode berlaku 5 menit.`);
}

export async function deleteCustomerAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = z.object({
    customerId: uuidSchema,
    confirmation: z.literal("HAPUS"),
  }).safeParse({
    customerId: safeFormText(formData, "customerId"),
    confirmation: safeFormText(formData, "confirmation").trim().toUpperCase(),
  });

  if (!parsed.success) return failure("Ketik HAPUS untuk mengonfirmasi penghapusan permanen.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_customer_account", {
    p_user_id: parsed.data.customerId,
  });

  if (error) {
    const missingMigration = error.code === "PGRST202" || (
      error.message.toLowerCase().includes("admin_delete_customer_account") &&
      error.message.toLowerCase().includes("schema cache")
    );
    if (missingMigration) {
      return failure("Migration penghapusan akun belum diterapkan. Jalankan `npx supabase db push` ke project production lalu coba kembali.");
    }
    return failure(friendlyMutationError("delete-customer", error));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/audit");
  redirect("/admin/customers");
}

export async function reviewStampRequestAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = z
    .object({
      requestId: uuidSchema,
      action: z.enum(["approve", "reject"]),
      approvedCount: z.coerce.number().int().min(0).max(6),
      adminNote: optionalNoteSchema,
      customerId: z.union([uuidSchema, z.literal("")]).optional(),
    })
    .safeParse({
      requestId: safeFormText(formData, "requestId"),
      action: safeFormText(formData, "action"),
      approvedCount: safeFormText(formData, "approvedCount"),
      adminNote: safeFormText(formData, "adminNote"),
      customerId: safeFormText(formData, "customerId"),
    });

  if (!parsed.success) {
    return failure("Data review tidak valid. Tutup dialog lalu coba lagi.");
  }

  const { requestId, action, approvedCount, adminNote, customerId } = parsed.data;
  if (action === "approve" && approvedCount < 1) {
    return failure("Approval harus menambahkan minimal 1 stamp.");
  }
  if (action === "reject" && approvedCount !== 0) {
    return failure("Request yang ditolak tidak boleh menambahkan stamp.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_stamp_request", {
    p_request_id: requestId,
    p_action: action,
    p_approved_count: action === "approve" ? approvedCount : 0,
    p_admin_note: adminNote,
  });

  if (error) return failure(friendlyMutationError("review-request", error));

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/audit");
  revalidatePath("/loyalty");
  revalidatePath("/loyalty/history");
  revalidatePath("/loyalty/rewards");
  if (customerId) revalidatePath(`/admin/customers/${customerId}`);

  return success(action === "reject" ? "Request berhasil ditolak." : `${approvedCount} stamp berhasil disetujui.`);
}

export async function adjustMemberStampsAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = z
    .object({
      memberCardId: uuidSchema,
      customerId: uuidSchema,
      quantity: z.coerce.number().int().refine((value) => value === 1 || value === -1),
      reason: z.string().trim().min(5, "Alasan minimal 5 karakter.").max(500),
    })
    .safeParse({
      memberCardId: safeFormText(formData, "memberCardId"),
      customerId: safeFormText(formData, "customerId"),
      quantity: safeFormText(formData, "quantity"),
      reason: safeFormText(formData, "reason"),
    });

  if (!parsed.success) {
    return failure("Pilih kartu aktif dan isi alasan penyesuaian minimal 5 karakter.");
  }

  const { memberCardId, customerId, quantity, reason } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_member_stamps", {
    p_member_card_id: memberCardId,
    p_quantity: quantity,
    p_reason: reason,
  });

  if (error) return failure(friendlyMutationError("adjust-stamps", error));

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/audit");
  revalidatePath("/loyalty");
  revalidatePath("/loyalty/history");
  revalidatePath("/loyalty/rewards");
  const result = data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
  if (result.completion_reversed === true) {
    return success(
      result.relocked_card_id
        ? "Completion berhasil dibuka ulang. Reward dibatalkan dan kartu berikutnya dikunci kembali."
        : "Completion berhasil dibuka ulang. Reward dibatalkan dan program kembali aktif.",
    );
  }
  return success(quantity > 0 ? "1 stamp berhasil diberikan." : "1 stamp berhasil dicabut.");
}

export async function redeemRewardAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = z
    .object({
      rewardId: uuidSchema,
      customerId: uuidSchema,
      note: optionalNoteSchema,
    })
    .safeParse({
      rewardId: safeFormText(formData, "rewardId"),
      customerId: safeFormText(formData, "customerId"),
      note: safeFormText(formData, "note"),
    });

  if (!parsed.success) return failure("Data reward tidak valid. Muat ulang lalu coba lagi.");

  const { rewardId, customerId, note } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_reward", {
    p_reward_id: rewardId,
    p_note: note,
  });

  if (error) return failure(friendlyMutationError("redeem-reward", error));

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/audit");
  revalidatePath("/loyalty/rewards");
  revalidatePath("/loyalty/history");
  return success("Reward berhasil ditandai sudah ditebus.");
}

export async function updateCardDefinitionAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const expiryInput = safeFormText(formData, "rewardExpiryDays").trim();
  const parsed = z
    .object({
      cardDefinitionId: uuidSchema,
      title: z.string().trim().min(1).max(120),
      description: z.string().trim().max(2000),
      rewardTitle: z.string().trim().max(160),
      rewardDescription: z.string().trim().max(2000),
      rewardTerms: z.string().trim().max(4000),
      rewardExpiryDays: z.union([z.coerce.number().int().min(1).max(3650), z.null()]),
    })
    .safeParse({
      cardDefinitionId: safeFormText(formData, "cardDefinitionId"),
      title: safeFormText(formData, "title"),
      description: safeFormText(formData, "description"),
      rewardTitle: safeFormText(formData, "rewardTitle"),
      rewardDescription: safeFormText(formData, "rewardDescription"),
      rewardTerms: safeFormText(formData, "rewardTerms"),
      rewardExpiryDays: expiryInput ? Number(expiryInput) : null,
    });

  if (!parsed.success) {
    return failure("Periksa judul, detail reward, dan masa berlaku sebelum menyimpan.");
  }

  const values = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_card_definition", {
    p_card_definition_id: values.cardDefinitionId,
    p_title: values.title,
    p_description: values.description || null,
    p_reward_title: values.rewardTitle || null,
    p_reward_description: values.rewardDescription || null,
    p_reward_terms: values.rewardTerms || null,
    p_reward_expiry_days: values.rewardExpiryDays,
    // The journey is fixed at seven operational cards. Definitions stay active;
    // admins may pause the entire program through the program settings form.
    p_is_active: true,
  });

  if (error) return failure(friendlyMutationError("update-card-definition", error));

  revalidatePath("/admin/program");
  revalidatePath("/admin/customers");
  revalidatePath("/loyalty");
  revalidatePath("/loyalty/rewards");
  return success("Pengaturan kartu dan reward berhasil disimpan.");
}

export async function updateLoyaltyProgramAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = z
    .object({
      programId: uuidSchema,
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(2000),
      isActive: z.boolean(),
    })
    .safeParse({
      programId: safeFormText(formData, "programId"),
      name: safeFormText(formData, "name"),
      description: safeFormText(formData, "description"),
      isActive: formData.get("isActive") === "on",
    });

  if (!parsed.success) {
    return failure("Periksa nama dan deskripsi program sebelum menyimpan.");
  }

  const values = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_loyalty_program_details", {
    p_program_id: values.programId,
    p_name: values.name,
    p_description: values.description || null,
    p_is_active: values.isActive,
  });

  if (error) return failure(friendlyMutationError("update-program", error));

  revalidatePath("/admin");
  revalidatePath("/admin/program");
  revalidatePath("/join");
  revalidatePath("/loyalty");
  revalidatePath("/loyalty/rewards");
  return success(values.isActive ? "Program berhasil diperbarui dan aktif." : "Program berhasil dijeda.");
}

export async function adminSignOutAction() {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
