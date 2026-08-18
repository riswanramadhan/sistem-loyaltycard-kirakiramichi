export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Memuat data admin" role="status">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-line/70" />
        <div className="h-4 w-full max-w-xl rounded bg-line/50" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-line bg-white" />
        ))}
      </div>
      <div className="h-80 rounded-2xl border border-line bg-white" />
      <span className="sr-only">Mohon tunggu…</span>
    </div>
  );
}
