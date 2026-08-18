export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-8" aria-busy="true">
      <span className="sr-only">Memuat halaman</span>
      <div className="h-12 w-40 animate-pulse rounded-xl bg-surface-muted" />
      <div className="mt-12 h-10 w-3/4 animate-pulse rounded-xl bg-surface-muted" />
      <div className="mt-4 h-5 w-1/2 animate-pulse rounded-lg bg-surface-muted" />
      <div className="mt-10 h-72 animate-pulse rounded-2xl bg-surface-muted" />
    </main>
  );
}
