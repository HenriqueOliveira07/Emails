"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { PageShell, Card, fmtDate, Empty } from "@/components/Layout/PageShell";
import { clsx } from "clsx";

const FILTERS = [
  ["all", "Todos"],
  ["errors", "Somente erros"],
];

export default function LogsPage() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(300),
    refetchInterval: 15_000,
  });
  const rows = (data ?? []).filter((l) => filter === "all" || !l.success);

  return (
    <PageShell title="Logs auditáveis">
      <Card
        title="Eventos de processamento"
        actions={
          <div className="flex gap-1">
            {FILTERS.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={clsx("px-3 py-1 rounded-lg text-sm", filter === v ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700")}
              >
                {l}
              </button>
            ))}
          </div>
        }
      >
        {isLoading ? (
          <Empty text="Carregando…" />
        ) : !rows.length ? (
          <Empty text="Nenhum evento registrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Data/hora</th>
                  <th className="px-4 py-3 text-left">Ação</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Duração</th>
                  <th className="px-4 py-3 text-left">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-slate-700/50 align-top">
                    <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{fmtDate(l.timestamp)}</td>
                    <td className="px-4 py-2 text-slate-200 font-mono text-xs">{l.action}</td>
                    <td className="px-4 py-2">
                      <span className={clsx("text-xs font-medium", l.success ? "text-emerald-400" : "text-red-400")}>
                        {l.success ? "OK" : l.error_type || "ERRO"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-400 tabular-nums">
                      {l.duration_ms != null ? `${Math.round(l.duration_ms)} ms` : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400 font-mono break-all">
                      {l.error_message || JSON.stringify(l.details ?? {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
