import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>(props: { columns: Column<T>[]; rows: T[]; getRowKey: (row: T) => string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-[var(--border)] bg-[color:var(--panel)]", props.className)}>
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
          <tr>
            {props.columns.map((c) => (
              <th key={c.key} className={cn("px-3 py-2 text-left font-medium", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {props.rows.map((r) => (
            <tr key={props.getRowKey(r)} className="hover:bg-white/5">
              {props.columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2 align-top", c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

