"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

interface ProcessingLogItem {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string;
  error_message: string;
  details: Record<string, unknown> | null;
}

const fetchLogs = (limit = 100, successFilter?: boolean): Promise<ProcessingLogItem[]> => {
  const params: Record<string, string | number> = { limit };
  if (successFilter !== undefined) params.success = successFilter ? "true" : "false";
  return api.get("/dashboard/processing-logs", { params }).then((r) => r.data);
};

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  system_error: "Erro do sistema",
};

export default function LogsPage() {
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");

  const successFilter = filter === "success" ? true : filter === "error" ? false : undefined;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["processing-logs", filter],
    queryFn: () => fetchLogs(200, successFilter),
    refetchInterval: 30_000,
  });

  const successes = logs.filter((l) => l.success).length;
  const errors = logs.filter((l) => !l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{logs.length}</p>
              <p className="text-xs text-slate-400 mt-1">Total de eventos</p>
            </div>
            <div className="bg-slate-800 border border-green-500/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{successes}</p>
              <p className="text-xs text-slate-400 mt-1">Sucesso</p>
            </div>
            <div className="bg-slate-800 border border-red-500/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{errors}</p>
              <p className="text-xs text-slate-400 mt-1">Erros</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(["all", "success", "error"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs transition-colors",
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                )}
              >
                {f === "all" ? "Todos" : f === "success" ? "Sucesso" : "Erros"}
              </button>
            ))}
          </div>

          {/* Log table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${logs.length} evento(s)`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-center w-8">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Detalhes</th>
                    <th className="px-4 py-3 text-right">Duração</th>
                    <th className="px-4 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Carregando logs...
                      </td>
                    </tr>
                  )}
                  {!isLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={clsx(
                        "border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors",
                        !log.success && "bg-red-500/5"
                      )}
                    >
                      <td className="px-4 py-3 text-center">
                        {log.success ? (
                          <CheckCircle size={14} className="text-green-400 mx-auto" />
                        ) : (
                          <XCircle size={14} className="text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-200 text-xs font-medium">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {!log.success && log.error_type && (
                          <div className="text-xs text-red-400 mt-0.5">{log.error_type}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <div className="text-xs text-slate-400 space-y-0.5">
                            {Object.entries(log.details)
                              .filter(([k]) => !["message_id", "file_path"].includes(k))
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <div key={k}>
                                  <span className="text-slate-500">{k}:</span>{" "}
                                  <span className="text-slate-300">{String(v).slice(0, 60)}</span>
                                </div>
                              ))}
                          </div>
                        ) : log.error_message ? (
                          <span className="text-xs text-red-400 line-clamp-2">{log.error_message}</span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                        {log.duration_ms != null ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                        {log.timestamp
                          ? format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })
                          : "—"}
                      </td>
                    </tr>
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
