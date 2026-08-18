import { LockKeyhole, Shapes, Stamp } from "lucide-react";
import { getAdminProgram } from "@/app/admin/_lib/admin-data";
import { ProgramDefinitionForm, ProgramSettingsForm } from "@/components/admin/action-controls";
import { AdminPageHeader, EmptyAdminState, formatAdminDate } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function AdminProgramPage() {
  const result = await getAdminProgram();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Program settings"
        title="Kartu & reward"
        description="Atur copy dan benefit untuk keenam kartu. Jumlah kartu dan kebutuhan stamp tetap dikunci sesuai aturan MVP."
      />

      {!result ? (
        <Card><EmptyAdminState title="Program belum tersedia" description="Jalankan migrasi dan seed database untuk membuat Kira Kira Michi Loyalty." /></Card>
      ) : (
        <>
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-extrabold text-ink">{result.program.name}</h2>
                  <Badge tone={result.program.is_active ? "success" : "neutral"}>{result.program.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{result.program.description || "Program loyalty utama Kira Kira Michi."}</p>
                <p className="mt-2 text-xs text-ink-faint">Terakhir diperbarui {formatAdminDate(result.program.updated_at)}</p>
              </div>
              <dl className="grid shrink-0 grid-cols-2 gap-3">
                <div className="min-w-32 rounded-xl bg-surface-muted px-4 py-3"><dt className="flex items-center gap-1.5 text-xs font-bold text-ink-muted"><Shapes className="size-3.5" />Total kartu</dt><dd className="mt-1 text-xl font-extrabold text-ink">{result.program.total_cards}</dd></div>
                <div className="min-w-32 rounded-xl bg-surface-muted px-4 py-3"><dt className="flex items-center gap-1.5 text-xs font-bold text-ink-muted"><Stamp className="size-3.5" />Stamp/card</dt><dd className="mt-1 text-xl font-extrabold text-ink">{result.program.stamps_per_card}</dd></div>
              </dl>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-xs leading-5 text-ink-muted">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Total 6 kartu dan 8 stamp per kartu tidak dapat diubah dari admin UI agar progres seluruh member tetap konsisten.
            </div>
            <ProgramSettingsForm
              program={{
                id: result.program.id,
                name: result.program.name,
                description: result.program.description ?? "",
                isActive: result.program.is_active,
              }}
            />
          </Card>

          <section aria-labelledby="definitions-title">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div><h2 id="definitions-title" className="font-extrabold text-ink">Enam definisi kartu</h2><p className="mt-1 text-xs text-ink-muted">Buka satu kartu untuk mengedit detailnya.</p></div>
              <span className="text-xs font-bold text-ink-muted">{result.definitions.length}/6 tersedia</span>
            </div>
            <div className="grid gap-3">
              {result.definitions.map((definition) => (
                <ProgramDefinitionForm
                  key={definition.id}
                  definition={{
                    id: definition.id,
                    sequenceNo: definition.sequence_no,
                    title: definition.title?.trim() || `Loyalty Card ${definition.sequence_no}`,
                    description: definition.description ?? "",
                    rewardTitle: definition.reward_title?.trim() || "",
                    rewardDescription: definition.reward_description ?? "",
                    rewardTerms: definition.reward_terms ?? "",
                    rewardExpiryDays: definition.reward_expiry_days,
                  }}
                />
              ))}
            </div>
            {result.definitions.length !== 6 ? (
              <p role="alert" className="mt-3 rounded-xl border border-warning/20 bg-warning-soft px-3 py-2.5 text-sm text-warning">
                Data program belum lengkap. Migrasi seharusnya menyediakan tepat 6 definisi kartu.
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
