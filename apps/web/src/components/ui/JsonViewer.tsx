import { cn } from "@/lib/cn";

export function JsonViewer(props: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "text-[12px] leading-5 font-mono rounded-lg border border-[var(--border)] bg-black/20 px-3 py-2 overflow-auto",
        props.className,
      )}
    >
      {JSON.stringify(props.value, null, 2)}
    </pre>
  );
}

