"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  system_error: "Erro do sistema",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "text-blue-400",
  email_ignored: "text-slate-400",
  attachment_saved: "text-purple-400",
  whatsapp_sent: "text-green-400",
  cycle_complete: "text-teal-400",
  system_error: "text-red-400",
};

export default function LogsPage() {
  const [filter, setFilter] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 30_000,
  });

  const filtered = (logs ?? []).filter((log: ProcessingLogItem) => {
    if (onlyErrors && log.success) return false;
    if (filter && !log.action.includes(filter)) return false;
    return true;
  });

  const stats = {
    total: logs?.length ?? 0,
    success: logs?.filter((l) => l.success).length ?? 0,
    errors: logs?.filter((l) => !l.success).length ?? 0,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Activity size={18} className="text-blue-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Total de eventos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={18} className="text-green-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.success}</p>
                <p className="text-xs text-slate-400">Bem-sucedidos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={18} className="text-red-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.errors}</p>
                <p className="text-xs text-slate-400">Erros</p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as ações</option>
              {Object.entries(ACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyErrors}
                onChange={(e) => setOnlyErrors(e.target.checked)}
                className="rounded"
              />
              Somente erros
            </label>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} evento(s)</span>
          </div>

          {/* Tabela de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Ação</th>
                      <th className="px-4 py-3 text-left">Detalhes</th>
                      <th className="px-4 py-3 text-left">Tempo</th>
                      <th className="px-4 py-3 text-left">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Nenhum log encontrado
                        </td>
                      </tr>
                    )}
                    {filtered.map((log: ProcessingLogItem) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          {log.success
                            ? <CheckCircle size={14} className="text-green-400" />
                            : <XCircle size={14} className="text-red-400" />}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium ${ACTION_COLORS[log.action] ?? "text-slate-300"}`}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 max-w-xs">
                          {log.error_message ? (
                            <span className="text-xs text-red-400 truncate block">{log.error_message}</span>
                          ) : log.details && Object.keys(log.details).length > 0 ? (
                            <span className="text-xs text-slate-400 truncate block">
                              {Object.entries(log.details)
                                .slice(0, 3)
                                .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                                .join(" | ")}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {log.duration_ms != null ? (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock size={10} />
                              {log.duration_ms.toFixed(0)}ms
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
