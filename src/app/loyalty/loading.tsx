export default function LoyaltyLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat loyalty kamu">
      <span className="sr-only">Memuat loyalty kamu…</span>
      <div className="h-6 w-28 animate-pulse rounded-lg bg-line/70 motion-reduce:animate-none" />
      <div className="h-9 w-56 animate-pulse rounded-xl bg-line/70 motion-reduce:animate-none" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-lg bg-line/60 motion-reduce:animate-none" />
      <div className="h-44 animate-pulse rounded-[1.75rem] bg-ink/10 motion-reduce:animate-none" />
      <div className="flex gap-4 overflow-hidden">
        <div className="h-[31rem] w-[calc(100vw-2.5rem)] max-w-[390px] shrink-0 animate-pulse rounded-[1.75rem] bg-line/55 motion-reduce:animate-none" />
        <div className="h-[31rem] w-[390px] shrink-0 animate-pulse rounded-[1.75rem] bg-line/40 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

