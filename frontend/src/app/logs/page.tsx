"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, RefreshCw, Clock, AlertCircle } from "lucide-react";
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
  cycle_complete: "Ciclo completo",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "text-blue-400",
  email_ignored: "text-slate-400",
  attachment_saved: "text-purple-400",
  whatsapp_sent: "text-green-400",
  cycle_complete: "text-cyan-400",
};

export default function LogsPage() {
  const [limit, setLimit] = useState(100);
  const [actionFilter, setActionFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState("");

  const { data = [], isLoading, refetch } = useQuery<ProcessingLog[]>({
    queryKey: ["processing-logs", limit],
    queryFn: () => api.get(`/dashboard/processing-logs?limit=${limit}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const filtered = data.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (successFilter === "ok" && !log.success) return false;
    if (successFilter === "erro" && log.success) return false;
    return true;
  });

  const stats = {
    total: data.length,
    success: data.filter((l) => l.success).length,
    errors: data.filter((l) => !l.success).length,
    avgMs: data.length
      ? Math.round(data.filter((l) => l.duration_ms).reduce((s, l) => s + (l.duration_ms || 0), 0) / data.length)
      : 0,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-2xl font-bold text-blue-400">{stats.avgMs}ms</p>
              <p className="text-xs text-slate-400 mt-1">Tempo médio</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas as ações</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <select
                value={successFilter}
                onChange={(e) => setSuccessFilter(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="ok">Sucesso</option>
                <option value="erro">Erros</option>
              </select>

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
                <option value={250}>250 registros</option>
              </select>

              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
              >
                <RefreshCw size={12} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${filtered.length} evento(s)`}
              </h3>
            </div>

            <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
              {isLoading && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando logs...</div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">Nenhum log encontrado</div>
              )}
              {filtered.map((log) => (
                <div key={log.id} className="px-5 py-3 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-start gap-3">
                    {log.success ? (
                      <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx("text-xs font-medium", ACTION_COLORS[log.action] || "text-slate-300")}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {log.duration_ms && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={10} />
                            {log.duration_ms.toFixed(0)}ms
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-3">
                          {Object.entries(log.details).map(([k, v]) => (
                            <span key={k}>
                              <span className="text-slate-600">{k}:</span>{" "}
                              <span className="text-slate-400">{String(v).slice(0, 60)}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {!log.success && log.error_message && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-red-400">
                          <AlertCircle size={10} />
                          {log.error_type && <span className="font-medium">{log.error_type}:</span>}
                          <span>{log.error_message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
