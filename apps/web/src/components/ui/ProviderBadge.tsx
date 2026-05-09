import { cn } from "@/lib/cn";

type Provider = "openai" | "google" | "anthropic" | "local" | "other" | string;

const styles: Record<string, string> = {
  openai: "bg-white/10 text-white/80 border-white/15",
  google: "bg-[color:var(--info)]/15 text-[color:var(--info)] border-[color:var(--info)]/25",
  anthropic: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/25",
};

export function ProviderBadge(props: { provider: Provider; className?: string }) {
  const key = String(props.provider).toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        styles[key] ?? "bg-white/10 text-white/80 border-white/15",
        props.className,
      )}
    >
      {props.provider}
    </span>
  );
}

