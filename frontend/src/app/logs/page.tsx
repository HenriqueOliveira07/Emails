"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, RefreshCw, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

interface ProcessingLog {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string;
  error_message: string;
  details: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo concluído",
  system_error: "Erro de sistema",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "text-blue-400",
  email_ignored: "text-slate-400",
  attachment_saved: "text-purple-400",
  whatsapp_sent: "text-green-400",
  cycle_complete: "text-cyan-400",
  system_error: "text-red-400",
};

export default function LogsPage() {
  const [filterAction, setFilterAction] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data, isLoading, refetch } = useQuery<ProcessingLog[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const logs = (data ?? []).filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterStatus === "success" && !log.success) return false;
    if (filterStatus === "error" && log.success) return false;
    return true;
  });

  const stats = {
    total: (data ?? []).length,
    success: (data ?? []).filter((l) => l.success).length,
    errors: (data ?? []).filter((l) => !l.success).length,
    avgDuration: (() => {
      const withTime = (data ?? []).filter((l) => l.duration_ms);
      if (!withTime.length) return 0;
      return withTime.reduce((a, b) => a + (b.duration_ms ?? 0), 0) / withTime.length;
    })(),
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-slate-400 mt-1">Total de eventos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{stats.success}</p>
              <p className="text-xs text-slate-400 mt-1">Sucesso</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
              <p className="text-xs text-slate-400 mt-1">Erros</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">{stats.avgDuration.toFixed(0)}ms</p>
              <p className="text-xs text-slate-400 mt-1">Tempo médio</p>
            </div>
          </div>

          {/* Tabela de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-slate-400">
                <Filter size={14} />
                <span className="text-xs font-medium">Filtros</span>
              </div>

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="">Todas ações</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="">Todos status</option>
                <option value="success">Sucesso</option>
                <option value="error">Erro</option>
              </select>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-400">{logs.length} eventos</span>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-8"></th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Detalhes</th>
                    <th className="px-4 py-3 text-left">Duração</th>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Carregando logs...
                      </td>
                    </tr>
                  )}
                  {!isLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        {log.success
                          ? <CheckCircle size={13} className="text-green-400" />
                          : <XCircle size={13} className="text-red-400" />
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx("text-xs font-medium", ACTION_COLORS[log.action] ?? "text-slate-300")}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {log.details && (
                          <div className="text-xs text-slate-400 truncate">
                            {log.details.sender
                              ? <span>{String(log.details.sender)}</span>
                              : log.details.filename
                              ? <span>{String(log.details.filename)}</span>
                              : log.details.emails_processed !== undefined
                              ? <span>
                                  {String(log.details.emails_processed)} proc · {String(log.details.emails_ignored ?? 0)} ignorados
                                </span>
                              : <span>{JSON.stringify(log.details).slice(0, 80)}</span>
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {log.duration_ms != null
                          ? `${log.duration_ms.toFixed(0)}ms`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {log.error_message ? (
                          <span className="text-xs text-red-400 truncate block" title={log.error_message}>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
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
