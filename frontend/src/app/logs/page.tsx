"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs, fetchLogSummary, LogItem, LogSummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  system_error: "Erro do Sistema",
};

export default function LogsPage() {
  const [sinceHours, setSinceHours] = useState(24);
  const [showErrors, setShowErrors] = useState(false);

  const { data: summary } = useQuery<LogSummary>({
    queryKey: ["log-summary"],
    queryFn: fetchLogSummary,
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["logs", sinceHours, showErrors],
    queryFn: () => fetchLogs({ since_hours: sinceHours, success: showErrors ? false : undefined, limit: 200 }),
    refetchInterval: 30_000,
  });

  const logs: LogItem[] = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <Activity size={20} className="text-blue-400" />
                <div>
                  <p className="text-xl font-bold text-white">{summary.total_events}</p>
                  <p className="text-xs text-slate-400">Eventos nas últimas 24h</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <XCircle size={20} className="text-red-400" />
                <div>
                  <p className="text-xl font-bold text-white">{summary.error_count}</p>
                  <p className="text-xs text-slate-400">Erros</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-400" />
                <div>
                  <p className="text-xl font-bold text-white">{summary.success_rate}%</p>
                  <p className="text-xs text-slate-400">Taxa de sucesso</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <Clock size={20} className="text-purple-400" />
                <div>
                  <p className="text-xl font-bold text-white">{summary.by_action.length}</p>
                  <p className="text-xs text-slate-400">Tipos de ação</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Summary Table */}
          {summary?.by_action && summary.by_action.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Resumo por Ação (24h)</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {summary.by_action.map((a) => (
                  <div key={a.action} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-300">
                      {ACTION_LABELS[a.action] || a.action}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{a.count}x</span>
                      {a.avg_duration_ms > 0 && (
                        <span className="text-xs text-slate-500">{a.avg_duration_ms}ms</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Período:</label>
              <select
                value={sinceHours}
                onChange={(e) => setSinceHours(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value={1}>Última hora</option>
                <option value={6}>Últimas 6h</option>
                <option value={24}>Últimas 24h</option>
                <option value={72}>Últimas 72h</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showErrors}
                onChange={(e) => setShowErrors(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700"
              />
              <span className="text-sm text-slate-400">Apenas erros</span>
            </label>
            <span className="ml-auto text-sm text-slate-400">{logs.length} evento(s)</span>
          </div>

          {/* Logs Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Detalhes</th>
                    <th className="px-4 py-3 text-left">Duração</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Carregando...</td>
                    </tr>
                  )}
                  {!isLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Nenhum log encontrado para o período selecionado
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-2.5">
                        {log.success ? (
                          <CheckCircle size={14} className="text-green-400" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 text-xs">
                        {ACTION_LABELS[log.action] || log.action}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs">
                        {log.error_message ? (
                          <span className="text-red-400">{log.error_message}</span>
                        ) : log.details ? (
                          <span className="font-mono truncate block">
                            {JSON.stringify(log.details).slice(0, 80)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {log.duration_ms ? `${Math.round(log.duration_ms)}ms` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
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
