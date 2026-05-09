"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export type SortDir = "asc" | "desc";

export type SortableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

export function SortableTable<T>(props: {
  columns: SortableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  defaultSort?: { key: string; dir: SortDir };
  className?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(props.defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return props.rows;
    const col = props.columns.find((c) => c.key === sort.key);
    const get = col?.sortValue;
    if (!get) return props.rows;
    const copy = [...props.rows];
    copy.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return sort.dir === "asc" ? copy : copy.reverse();
  }, [props.rows, props.columns, sort]);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-[var(--border)] bg-[color:var(--panel)]", props.className)}>
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
          <tr>
            {props.columns.map((c) => {
              const active = sort?.key === c.key;
              const label = active ? `${c.header} (${sort?.dir})` : c.header;
              return (
                <th
                  key={c.key}
                  className={cn("px-3 py-2 text-left font-medium select-none", c.className, c.sortValue ? "cursor-pointer hover:text-white/80" : "")}
                  onClick={() => {
                    if (!c.sortValue) return;
                    setSort((prev) => {
                      if (!prev || prev.key !== c.key) return { key: c.key, dir: "desc" };
                      return { key: c.key, dir: prev.dir === "desc" ? "asc" : "desc" };
                    });
                  }}
                  title={c.sortValue ? "Click to sort" : undefined}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map((r) => (
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

