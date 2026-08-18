import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, CalendarDays, Gift, Mail, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { getAdminCustomerDetail } from "@/app/admin/_lib/admin-data";
import { CustomerAdjustmentActions, RedeemRewardAction, ReviewStampRequestActions } from "@/components/admin/action-controls";
import {
  AdminPageHeader,
  CardStatusBadge,
  EmptyAdminState,
  RequestStatusBadge,
  RewardStatusBadge,
  displayText,
  formatAdminDate,
} from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function ContactLink({ type, value }: { type: "email" | "whatsapp"; value: string | null | undefined }) {
  const Icon = type === "email" ? Mail : MessageCircle;
  if (!value) return <span className="inline-flex items-center gap-2 text-ink-muted"><Icon className="size-4" />Belum tersedia</span>;
  const href = type === "email" ? `mailto:${value}` : `https://wa.me/${value.replace(/\D/g, "").replace(/^0/, "62")}`;
  return <a href={href} target={type === "whatsapp" ? "_blank" : undefined} rel={type === "whatsapp" ? "noreferrer" : undefined} className="inline-flex items-center gap-2 break-all font-medium text-ink hover:text-brand hover:underline"><Icon className="size-4 shrink-0" />{value}</a>;
}

function eventQuantity(eventType: string, quantity: number) {
  const absolute = Math.abs(quantity);
  return eventType === "revoke" || quantity < 0 ? `−${absolute}` : `+${absolute}`;
}

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const detail = await getAdminCustomerDetail(id);
  if (!detail) notFound();

  const { profile, program, cards, requests, events, rewards } = detail;
  const currentCards = program
    ? cards.filter((card) => card.member_program_id === program.id)
    : [];
  const activeCard = currentCards.find((card) => card.status === "active") ?? null;
  // This async Server Component is request-bound; one timestamp keeps all rows consistent.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isRewardExpired = (expiresAt: string | null) =>
    Boolean(expiresAt && new Date(expiresAt).getTime() <= now);
  const availableRewards = rewards.filter(
    (reward) => reward.status === "available" && !isRewardExpired(reward.expires_at),
  );
  const latestCompletedCard = currentCards
    .filter((card) => card.status === "completed")
    .sort((left, right) => right.sequence_no - left.sequence_no)[0];
  const reversibleCompletionId = (() => {
    if (!latestCompletedCard) return null;
    const reward = rewards.find((item) => item.member_card_id === latestCompletedCard.id);
    if (!reward || reward.status !== "available") return null;
    if (requests.some((request) => request.status === "pending")) return null;
    if (latestCompletedCard.sequence_no < 6) {
      const nextCard = currentCards.find(
        (card) => card.sequence_no === latestCompletedCard.sequence_no + 1,
      );
      if (!nextCard || nextCard.status !== "active" || nextCard.stamps_count !== 0) return null;
      if (program?.status !== "active") return null;
    } else if (program?.status !== "completed") {
      return null;
    }
    const laterCardIds = new Set(
      currentCards.filter((card) => card.sequence_no > latestCompletedCard.sequence_no).map((card) => card.id),
    );
    const hasDownstreamProgress = currentCards.some(
      (card) => card.sequence_no > latestCompletedCard.sequence_no && card.stamps_count > 0,
    );
    const hasDownstreamActivity =
      events.some((event) => laterCardIds.has(event.member_card_id)) ||
      requests.some((request) => laterCardIds.has(request.member_card_id));
    return hasDownstreamProgress || hasDownstreamActivity ? null : latestCompletedCard.id;
  })();
  const adjustmentCards = currentCards.map((card) => ({
    id: card.id,
    sequence: card.sequence_no,
    title: card.definition?.title?.trim() || `Loyalty Card ${card.sequence_no}`,
    status: card.status,
    stamps: card.stamps_count,
    canReverseCompletion: card.id === reversibleCompletionId,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Customer profile"
        title={profile.full_name?.trim() || "Customer tanpa nama"}
        description="Profil lengkap, perjalanan loyalty, request, stamp ledger, reward, dan koreksi admin."
        actions={
          <Link href="/admin/customers" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-bold text-ink hover:border-brand/40 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Semua customer
          </Link>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.65fr)]" aria-label="Informasi customer">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><UserRound className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-ink">Informasi customer</h2>
                <Badge tone={program?.status === "completed" ? "success" : program ? "brand" : "neutral"}>
                  {program?.status === "completed" ? "Program selesai" : program ? "Member aktif" : "Belum bergabung"}
                </Badge>
              </div>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Email</dt><dd className="mt-1.5"><ContactLink type="email" value={profile.email} /></dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">WhatsApp</dt><dd className="mt-1.5"><ContactLink type="whatsapp" value={profile.whatsapp} /></dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Bergabung</dt><dd className="mt-1.5 inline-flex items-center gap-2 font-medium"><CalendarDays className="size-4 text-ink-muted" />{formatAdminDate(program?.joined_at ?? profile.created_at)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">Marketing consent</dt><dd className="mt-1.5 inline-flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-ink-muted" />{profile.marketing_consent ? "Ya" : "Tidak"}</dd></div>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">Kartu saat ini</p>
              <h2 className="mt-1 font-extrabold text-ink">{activeCard ? `Card ${activeCard.sequence_no} · ${activeCard.definition?.title ?? "Loyalty Card"}` : program?.status === "completed" ? "Journey selesai" : "Belum ada kartu aktif"}</h2>
              <p className="mt-2 text-sm text-ink-muted">
                {activeCard
                  ? `${activeCard.stamps_count}/8 stamp terkumpul`
                  : reversibleCompletionId
                    ? "Completion terakhir masih dapat dikoreksi dengan alasan audit."
                    : "Tidak ada penyesuaian yang dapat dilakukan."}
              </p>
            </div>
            {activeCard ? <CardStatusBadge status={activeCard.status} /> : null}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-3 text-xs font-bold text-ink-muted">Penyesuaian manual wajib menyertakan alasan.</p>
            <CustomerAdjustmentActions customerId={profile.id} cards={adjustmentCards} />
          </div>
        </Card>
      </section>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-extrabold text-ink">Loyalty journey</h2><p className="mt-1 text-xs text-ink-muted">{program?.programName ?? "Customer belum bergabung ke program."}</p></div>
          {program ? <Badge tone={program.status === "completed" ? "success" : "brand"}>{program.status === "completed" ? "Selesai" : "Berjalan"}</Badge> : null}
        </div>
        {!cards.length ? (
          <EmptyAdminState title="Belum ada loyalty journey" description="Kartu akan dibuat ketika customer bergabung melalui link atau QR." />
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article key={card.id} className={cn("rounded-2xl border p-4", card.status === "active" ? "border-brand/35 bg-brand-soft/35" : "border-line bg-surface-muted/40")}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">Card {card.sequence_no} dari 6</p><h3 className="mt-1 font-extrabold text-ink">{card.definition?.title ?? `Loyalty Card ${card.sequence_no}`}</h3></div>
                  <CardStatusBadge status={card.status} />
                </div>
                <div className="mt-4 grid grid-cols-8 gap-1.5" role="img" aria-label={`${card.stamps_count} dari 8 stamp terkumpul`}>
                  {Array.from({ length: 8 }, (_, index) => (
                    <span key={index} className={cn("aspect-square rounded-full border", index < card.stamps_count ? "border-brand bg-brand" : "border-line bg-white")} />
                  ))}
                </div>
                <p className="mt-3 text-xs font-bold text-ink-muted">{card.stamps_count}/8 stamp{card.completed_at ? ` · selesai ${formatAdminDate(card.completed_at, false)}` : ""}</p>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2"><Gift className="size-4 text-accent-strong" aria-hidden="true" /><h2 className="font-extrabold text-ink">Rewards</h2></div>
          <p className="mt-1 text-xs text-ink-muted">{availableRewards.length} reward siap ditebus.</p>
        </div>
        {!rewards.length ? (
          <EmptyAdminState title="Belum ada reward" description="Reward terbuka otomatis setelah customer menyelesaikan kartu." />
        ) : (
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {rewards.map((reward) => (
              <article key={reward.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-bold text-ink-muted">Reward Card {reward.cardSequence}</p><h3 className="mt-1 font-extrabold text-ink">{reward.rewardTitle}</h3></div>
                  <RewardStatusBadge status={isRewardExpired(reward.expires_at) && reward.status === "available" ? "expired" : reward.status} />
                </div>
                <p className="mt-3 text-xs leading-5 text-ink-muted">
                  Tersedia {formatAdminDate(reward.available_at)}
                  {reward.expires_at ? ` · berlaku hingga ${formatAdminDate(reward.expires_at)}` : " · tanpa batas waktu"}
                  {reward.redeemed_at ? ` · ditebus ${formatAdminDate(reward.redeemed_at)}` : ""}
                </p>
                {reward.note ? <p className="mt-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink-muted">{reward.note}</p> : null}
                {reward.status === "available" && !isRewardExpired(reward.expires_at) ? <div className="mt-4"><RedeemRewardAction rewardId={reward.id} customerId={profile.id} rewardTitle={reward.rewardTitle} /></div> : null}
              </article>
            ))}
          </div>
        )}
      </Card>

      <section className="grid gap-4 2xl:grid-cols-2" aria-label="Riwayat customer">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-4 py-4 sm:px-5"><h2 className="font-extrabold text-ink">Stamp requests</h2><p className="mt-1 text-xs text-ink-muted">Riwayat pengajuan dan keputusan admin.</p></div>
          {!requests.length ? (
            <EmptyAdminState title="Belum ada request" description="Request customer akan tampil di sini." />
          ) : (
            <ol className="divide-y divide-line">
              {requests.map((request) => (
                <li key={request.id} className="p-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-extrabold text-ink">+{request.requested_count} Stamp · Card {request.cardSequence}</p><p className="mt-1 text-xs text-ink-muted">{formatAdminDate(request.requested_at)}</p></div>
                    <RequestStatusBadge status={request.status} />
                  </div>
                  {request.customer_note ? <p className="mt-2 text-xs leading-5 text-ink-muted">Customer: {request.customer_note}</p> : null}
                  {request.admin_note ? <p className="mt-1 text-xs leading-5 text-ink-muted">Admin: {request.admin_note}</p> : null}
                  {request.status === "pending" ? <div className="mt-3"><ReviewStampRequestActions requestId={request.id} customerId={profile.id} requestedCount={request.requested_count} /></div> : null}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line px-4 py-4 sm:px-5"><h2 className="font-extrabold text-ink">Stamp ledger</h2><p className="mt-1 text-xs text-ink-muted">Catatan immutable untuk approval dan penyesuaian manual.</p></div>
          {!events.length ? (
            <EmptyAdminState title="Belum ada event stamp" description="Stamp yang disetujui atau disesuaikan akan tercatat di ledger." />
          ) : (
            <ol className="divide-y divide-line">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3 p-4 sm:px-5">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold", event.event_type === "revoke" || event.quantity < 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
                    {eventQuantity(event.event_type, event.quantity)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-ink">{event.event_type === "revoke" ? "Stamp dicabut" : "Stamp diberikan"} · Card {event.cardSequence}</p><span className="text-xs text-ink-muted">{formatAdminDate(event.created_at)}</span></div>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">oleh {event.actorName ?? "Sistem"}{event.reason ? ` · ${displayText(event.reason)}` : ""}</p>
                    {event.stamp_request_id ? <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">Request {event.stamp_request_id}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>
    </div>
  );
}
