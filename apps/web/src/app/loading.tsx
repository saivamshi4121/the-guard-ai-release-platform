import { AppShell } from "@/components/shell/AppShell";

export default function Loading() {
  return (
    <AppShell title="Release overview">
      <div className="space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)] px-4 py-3">
              <div className="h-3 w-24 rounded bg-white/5 border border-white/10" />
              <div className="mt-2 h-6 w-28 rounded bg-white/5 border border-white/10" />
              <div className="mt-2 h-3 w-40 rounded bg-white/5 border border-white/10" />
            </div>
          ))}
        </section>
        <div className="rounded-lg border border-[var(--border)] bg-[color:var(--panel)] p-4">
          <div className="text-sm font-semibold">Loading release overview…</div>
          <div className="mt-3 space-y-2">
            <div className="h-10 rounded-md bg-white/5 border border-white/10" />
            <div className="h-10 rounded-md bg-white/5 border border-white/10" />
            <div className="h-10 rounded-md bg-white/5 border border-white/10" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

