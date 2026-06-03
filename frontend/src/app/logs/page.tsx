"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs, fetchLogStats } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Filter, Activity, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
};

export default function LogsPage() {
  const [action, setAction] = useState("");
  const [success, setSuccess] = useState<"" | "true" | "false">("");

  const params: Record<string, string | number | boolean> = { limit: 200, offset: 0 };
  if (action) params.action = action;
  if (success !== "") params.success = success === "true";

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["logs", params],
    queryFn: () => fetchLogs(params),
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["log-stats"],
    queryFn: fetchLogStats,
    refetchInterval: 30_000,
  });

  const logs = logsData?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <Activity size={20} className="text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_logs}</p>
                  <p className="text-xs text-slate-400">Eventos hoje</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <XCircle size={20} className="text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.errors}</p>
                  <p className="text-xs text-slate-400">Erros</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <TrendingUp size={20} className="text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.success_rate}%</p>
                  <p className="text-xs text-slate-400">Taxa de sucesso</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <Clock size={20} className="text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.avg_processing_ms ? `${Math.round(stats.avg_processing_ms)}ms` : "—"}
                  </p>
                  <p className="text-xs text-slate-400">Tempo médio</p>
                </div>
              </div>
            </div>
          )}

          {/* Ações mais frequentes */}
          {stats?.by_action && Object.keys(stats.by_action).length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Eventos por Ação (hoje)</h3>
              <div className="space-y-2">
                {Object.entries(stats.by_action).map(([act, count]) => {
                  const total = Object.values(stats.by_action).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={act} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-44 shrink-0 truncate">
                        {ACTION_LABELS[act] ?? act}
                      </span>
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-300 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-slate-400" />
              <span className="text-sm text-slate-300 font-medium">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Filtrar por ação..."
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
              />
              <select
                value={success}
                onChange={(e) => setSuccess(e.target.value as "" | "true" | "false")}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="true">Sucesso</option>
                <option value="false">Erro</option>
              </select>
            </div>
          </div>

          {/* Tabela de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {logs.length} log{logs.length !== 1 ? "s" : ""}
              </h3>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
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
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                          Nenhum log encontrado
                        </td>
                      </tr>
                    )}
                    {logs.map((log) => (
                      <tr key={log.id} className={clsx(
                        "border-b border-slate-700/50 transition-colors",
                        log.success ? "hover:bg-slate-700/20" : "bg-red-500/5 hover:bg-red-500/10"
                      )}>
                        <td className="px-4 py-2 text-center">
                          {log.success
                            ? <CheckCircle size={13} className="text-green-400 mx-auto" />
                            : <XCircle size={13} className="text-red-400 mx-auto" />}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs text-slate-300">
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500 max-w-xs">
                          {!log.success && log.error_message ? (
                            <span className="text-red-400">{log.error_message}</span>
                          ) : log.details ? (
                            <span className="truncate block">
                              {JSON.stringify(log.details).slice(0, 120)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-slate-500">
                          {log.duration_ms ? `${Math.round(log.duration_ms)}ms` : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-slate-500 whitespace-nowrap">
                          {log.timestamp
                            ? format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })
                            : "—"}
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
