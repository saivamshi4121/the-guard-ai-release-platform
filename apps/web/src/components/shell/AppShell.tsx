import Link from "next/link";
import { cn } from "@/lib/cn";
import { Activity, FlaskConical, History, LayoutDashboard, LineChart } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/benchmarks", label: "Benchmarks", icon: LineChart },
];

export function AppShell(props: { children: React.ReactNode; title?: string; right?: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-[var(--border)] bg-[color:var(--panel)]">
        <div className="h-14 px-4 flex items-center gap-2 border-b border-[var(--border)]">
          <div className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-[var(--info)]" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">The Guard</div>
            <div className="text-[11px] text-[var(--muted)]">Release Safety</div>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 text-white/70" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-3 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5" />
            Phase 3 foundation UI
          </div>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[color:var(--panel)]/70 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold tracking-tight">{props.title ?? "Dashboard"}</div>
            <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
              Runs • Regressions • Benchmarks
            </span>
          </div>
          <div className="flex items-center gap-2">{props.right}</div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{props.children}</main>
      </div>
    </div>
  );
}

