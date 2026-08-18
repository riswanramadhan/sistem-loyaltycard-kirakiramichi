"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogOut, Mail, Pencil, Phone, Save, ShieldCheck, UserRound, X } from "lucide-react";
import {
  changePasswordAction,
  logoutAction,
  updateProfileAction,
} from "@/app/loyalty/actions";
import { formatDate } from "@/components/loyalty/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";

type Panel = "profile" | "password" | null;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "K") + (parts[1]?.[0] ?? "M");
}

export function ProfilePanel({
  fullName,
  email,
  whatsapp,
  marketingConsent,
  memberSince,
}: {
  fullName: string;
  email: string;
  whatsapp: string | null;
  marketingConsent: boolean;
  memberSince: string | null;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState(fullName);
  const [phone, setPhone] = useState(whatsapp ?? "");
  const [consent, setConsent] = useState(marketingConsent);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openPanel = (next: Exclude<Panel, null>) => {
    setMessage(null);
    setPanel(next);
  };

  const cancel = () => {
    setName(fullName);
    setPhone(whatsapp ?? "");
    setConsent(marketingConsent);
    setPassword("");
    setConfirmation("");
    setMessage(null);
    setPanel(null);
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfileAction({
        fullName: name,
        whatsapp: phone,
        marketingConsent: consent,
      });
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        setPanel(null);
        router.refresh();
      }
    });
  };

  const savePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await changePasswordAction({ password, confirmation });
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        setPassword("");
        setConfirmation("");
        setPanel(null);
      }
    });
  };

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <section className="overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[0_14px_40px_rgba(43,39,40,0.07)]">
        <div className="relative bg-ink p-5 text-white sm:p-6">
          <span className="absolute -right-7 -top-8 size-28 rotate-12 rounded-[42%] bg-brand" aria-hidden="true" />
          <span className="absolute right-20 top-5 size-4 rotate-45 rounded-sm bg-accent" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-[1.25rem] bg-accent text-xl font-black uppercase text-ink shadow-[0_4px_0_#d6aa00]">
              {initials(fullName)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold tracking-tight">{fullName}</h2>
              <p className="mt-1 truncate text-sm text-white/70">{email}</p>
              <Badge tone={marketingConsent ? "success" : "neutral"} className="mt-2">
                Marketing {marketingConsent ? "aktif" : "nonaktif"}
              </Badge>
            </div>
          </div>
        </div>

        <dl className="divide-y divide-line px-5 sm:px-6">
          <div className="flex items-start gap-3 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <UserRound className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-bold text-ink-muted">Nama lengkap</dt>
              <dd className="mt-1 break-words text-sm font-bold text-ink">{fullName}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Mail className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-bold text-ink-muted">Email akun</dt>
              <dd className="mt-1 break-all text-sm font-bold text-ink">{email}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Phone className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-bold text-ink-muted">WhatsApp</dt>
              <dd className="mt-1 break-words text-sm font-bold text-ink">{whatsapp || "Belum diisi"}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-bold text-ink-muted">Member sejak</dt>
              <dd className="mt-1 text-sm font-bold text-ink">{formatDate(memberSince)}</dd>
            </div>
          </div>
        </dl>
      </section>

      <div className="space-y-4">
        {message ? (
          <StatusMessage tone={message.tone}>
            {message.text}
          </StatusMessage>
        ) : null}

        {panel === "profile" ? (
          <form onSubmit={saveProfile} className="rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_30px_rgba(43,39,40,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Data aman</p>
                <h2 className="mt-1 text-lg font-extrabold text-ink">Edit profile</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={cancel} disabled={isPending} aria-label="Batal edit profile">
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <fieldset disabled={isPending} className="mt-5 space-y-4">
              <Field
                label="Nama lengkap"
                name="full-name"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Field
                label="WhatsApp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                hint="Sertakan kode negara, misalnya +62."
              />
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-muted/55 p-3 text-sm leading-5 text-ink">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5 size-4 accent-brand"
                />
                <span>
                  <span className="block font-bold">Info dan promo via WhatsApp</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">Opsional—kamu bisa mengubah pilihan ini kapan saja.</span>
                </span>
              </label>
            </fieldset>
            <Button type="submit" className="mt-5 w-full" disabled={isPending}>
              <Save className="size-4" aria-hidden="true" />
              {isPending ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </form>
        ) : panel === "password" ? (
          <form onSubmit={savePassword} className="rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_30px_rgba(43,39,40,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand">Keamanan akun</p>
                <h2 className="mt-1 text-lg font-extrabold text-ink">Change password</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={cancel} disabled={isPending} aria-label="Batal ubah password">
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <fieldset disabled={isPending} className="mt-5 space-y-4">
              <div className="relative">
                <Field
                  label="Password baru"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  hint="Minimal 8 karakter. Gunakan kombinasi yang sulit ditebak."
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-2 top-8 grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
              <Field
                label="Konfirmasi password"
                name="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </fieldset>
            <Button type="submit" className="mt-5 w-full" disabled={isPending}>
              <KeyRound className="size-4" aria-hidden="true" />
              {isPending ? "Mengubah…" : "Ubah password"}
            </Button>
          </form>
        ) : (
          <section className="rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_30px_rgba(43,39,40,0.05)]">
            <h2 className="text-lg font-extrabold text-ink">Pengaturan akun</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Kelola data yang aman dan keamanan login kamu.</p>
            <div className="mt-5 grid gap-3">
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => openPanel("profile")}>
                <Pencil className="size-4" aria-hidden="true" /> Edit Profile
              </Button>
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => openPanel("password")}>
                <KeyRound className="size-4" aria-hidden="true" /> Change Password
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" className="w-full justify-start text-danger hover:bg-danger-soft hover:text-danger">
                  <LogOut className="size-4" aria-hidden="true" /> Logout
                </Button>
              </form>
            </div>
            <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
              Email akun dan role tidak dapat diubah dari halaman ini. Perubahan password diproses langsung oleh Supabase Auth.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

