import { z } from "zod";

export const WHATSAPP_PATTERN = /^[0-9+(). -]+$/;

export const whatsappSchema = z
  .string()
  .trim()
  .min(5, "Nomor WhatsApp terlalu pendek.")
  .max(30, "Nomor WhatsApp terlalu panjang.")
  .regex(
    WHATSAPP_PATTERN,
    "Nomor WhatsApp hanya boleh berisi angka dan tanda telepon umum.",
  );
