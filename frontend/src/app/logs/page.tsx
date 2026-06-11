"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  system_error: "Erro do Sistema",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  email_ignored: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  attachment_saved: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  whatsapp_sent: "bg-green-500/20 text-green-400 border-green-500/30",
  cycle_complete: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  system_error: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function LogsPage() {
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 30_000,
  });

  const filtered = logs.filter((l) => {
    if (filter === "success" && !l.success) return false;
    if (filter === "error" && l.success) return false;
    if (actionFilter && l.action !== actionFilter) return false;
    return true;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const errors = logs.filter((l) => !l.success).length;
  const successes = logs.filter((l) => l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 overflow-y-auto space-y-6">

          {/* Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total de Eventos", value: logs.length, color: "text-white" },
              { label: "Com Sucesso", value: successes, color: "text-green-400" },
              { label: "Erros", value: errors, color: "text-red-400" },
              {
                label: "Ciclos Completos",
                value: logs.filter((l) => l.action === "cycle_complete").length,
                color: "text-indigo-400",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={clsx("text-2xl font-bold", color)}>{value}</p>
                <p className="text-sm text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status */}
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
              {(["all", "success", "error"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    filter === s ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  {s === "all" ? "Todos" : s === "success" ? "Sucesso" : "Erros"}
                </button>
              ))}
            </div>

            {/* Tipo de ação */}
            <select
              value={actionFilter ?? ""}
              onChange={(e) => setActionFilter(e.target.value || null)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos os tipos</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a] || a}
                </option>
              ))}
            </select>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>

          <p className="text-xs text-slate-500">{filtered.length} evento(s) exibido(s)</p>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-center w-10">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-right">Duração</th>
                    <th className="px-4 py-3 text-left">Detalhes</th>
                    <th className="px-4 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Carregando logs...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                  {filtered.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3 text-center">
                          {log.success ? (
                            <CheckCircle size={14} className="text-green-400 mx-auto" />
                          ) : (
                            <XCircle size={14} className="text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-md text-xs font-medium border",
                              ACTION_COLORS[log.action] ??
                                "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            )}
                          >
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", {
                            locale: ptBR,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs whitespace-nowrap">
                          {log.duration_ms != null
                            ? `${log.duration_ms.toFixed(0)} ms`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[300px]">
                          {log.error_message ? (
                            <span className="text-red-400">{log.error_message}</span>
                          ) : log.details ? (
                            <span className="text-slate-500">
                              {Object.entries(log.details)
                                .slice(0, 2)
                                .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                                .join(" · ")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === log.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={6} className="px-6 py-4">
                            <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                            {log.error_type && (
                              <p className="text-xs text-red-400 mt-2">
                                Tipo: {log.error_type} — {log.error_message}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
