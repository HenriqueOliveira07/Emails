"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs, fetchLogStats, LogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Activity, AlertTriangle, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  system_error: "Erro de Sistema",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "bg-blue-500/20 text-blue-400",
  email_ignored: "bg-slate-500/20 text-slate-400",
  attachment_saved: "bg-purple-500/20 text-purple-400",
  whatsapp_sent: "bg-green-500/20 text-green-400",
  cycle_complete: "bg-cyan-500/20 text-cyan-400",
  system_error: "bg-red-500/20 text-red-400",
};

export default function LogsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 100;

  const params: Record<string, string | number | boolean> = { limit, offset: page * limit };
  if (actionFilter) params.action = actionFilter;
  if (successFilter === "true") params.success = true;
  if (successFilter === "false") params.success = false;

  const { data, isLoading } = useQuery({
    queryKey: ["logs", actionFilter, successFilter, page],
    queryFn: () => fetchLogs(params),
    refetchInterval: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["log-stats"],
    queryFn: fetchLogStats,
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Activity className="text-blue-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.total_today ?? "--"}</p>
                <p className="text-xs text-slate-400">Eventos Hoje</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.errors_today ?? 0}</p>
                <p className="text-xs text-slate-400">Erros Hoje</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Activity className="text-cyan-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.total_all ?? "--"}</p>
                <p className="text-xs text-slate-400">Total Historico</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="text-orange-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.errors_all ?? 0}</p>
                <p className="text-xs text-slate-400">Erros Historico</p>
              </div>
            </div>
          </div>

          {/* Actions breakdown */}
          {stats?.actions_today && Object.keys(stats.actions_today).length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Acoes de Hoje</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.actions_today).map(([action, count]) => (
                  <span key={action} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${ACTION_COLORS[action] || "bg-slate-700 text-slate-300"}`}>
                    {ACTION_LABELS[action] || action}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <Filter size={16} className="text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="">Todas as Acoes</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={successFilter}
              onChange={(e) => { setSuccessFilter(e.target.value); setPage(0); }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="">Todos os Status</option>
              <option value="true">Sucesso</option>
              <option value="false">Erro</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Acao</th>
                    <th className="px-4 py-3 text-left">Detalhes</th>
                    <th className="px-4 py-3 text-right">Duracao</th>
                    <th className="px-4 py-3 text-left">Horario</th>
                    <th className="px-4 py-3 text-left">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Carregando...</td></tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum log encontrado</td></tr>
                  )}
                  {items.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-center">
                        {log.success ? (
                          <CheckCircle size={14} className="text-green-400 mx-auto" />
                        ) : (
                          <XCircle size={14} className="text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs ${ACTION_COLORS[log.action] || "bg-slate-700 text-slate-300"}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 truncate max-w-[300px]">
                        {log.details ? summarizeDetails(log.details) : "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 text-right whitespace-nowrap">
                        {log.duration_ms ? `${log.duration_ms.toFixed(0)}ms` : "--"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {log.timestamp ? format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR }) : "--"}
                      </td>
                      <td className="px-4 py-3">
                        {log.error_message && (
                          <p className="text-xs text-red-400 truncate max-w-[200px]" title={log.error_message}>
                            {log.error_type ? `[${log.error_type}] ` : ""}{log.error_message}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Total: {data?.total ?? 0} logs &middot; Pagina {page + 1}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300">
                  Anterior
                </button>
                <button onClick={() => setPage(page + 1)} disabled={items.length < limit}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300">
                  Proximo
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function summarizeDetails(details: Record<string, unknown>): string {
  const parts: string[] = [];
  if (details.sender) parts.push(`De: ${details.sender}`);
  if (details.subject) parts.push(`Assunto: ${String(details.subject).slice(0, 60)}`);
  if (details.priority) parts.push(`Prioridade: ${details.priority}`);
  if (details.filename) parts.push(`Arquivo: ${details.filename}`);
  if (details.emails_processed !== undefined) parts.push(`Processados: ${details.emails_processed}`);
  if (details.emails_ignored !== undefined) parts.push(`Ignorados: ${details.emails_ignored}`);
  if (parts.length) return parts.join(" | ");
  return JSON.stringify(details).slice(0, 120);
}
