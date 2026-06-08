"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogItem {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Concluído",
  system_error: "Erro do Sistema",
};

export default function LogsPage() {
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: logs = [], isLoading, dataUpdatedAt } = useQuery<LogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: autoRefresh ? 15_000 : false,
  });

  const filtered = logs.filter((l) => {
    if (filter === "success") return l.success;
    if (filter === "error") return !l.success;
    return true;
  });

  const successCount = logs.filter((l) => l.success).length;
  const errorCount = logs.filter((l) => !l.success).length;
  const avgDuration = logs
    .filter((l) => l.duration_ms !== null)
    .reduce((acc, l, _, arr) => acc + (l.duration_ms ?? 0) / arr.length, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{logs.length}</p>
              <p className="text-xs text-slate-400 mt-1">Total de Eventos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{successCount}</p>
              <p className="text-xs text-slate-400 mt-1">Sucessos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              <p className="text-xs text-slate-400 mt-1">Erros</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">
                {avgDuration > 0 ? `${avgDuration.toFixed(0)}ms` : "—"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Tempo Médio</p>
            </div>
          </div>

          {/* Controles */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4 flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
              {(["all", "success", "error"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    filter === f
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {f === "all" ? "Todos" : f === "success" ? "Sucesso" : "Erros"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                autoRefresh
                  ? "border-green-500/50 bg-green-500/10 text-green-400"
                  : "border-slate-600 text-slate-400 hover:text-white"
              }`}
            >
              <RefreshCw size={11} className={autoRefresh ? "animate-spin" : ""} />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </button>

            {dataUpdatedAt > 0 && (
              <span className="text-xs text-slate-500 ml-auto">
                Atualizado: {format(new Date(dataUpdatedAt), "HH:mm:ss", { locale: ptBR })}
              </span>
            )}
          </div>

          {/* Logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                Eventos ({filtered.length})
              </h3>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando logs...</div>
            ) : (
              <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhum evento encontrado
                  </div>
                )}
                {filtered.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-700/20 transition-colors">
                    <div className="mt-0.5">
                      {log.success ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {log.duration_ms !== null && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-500">
                            <Clock size={10} />
                            {log.duration_ms.toFixed(0)}ms
                          </span>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-1 text-xs text-slate-400 space-x-2">
                          {Object.entries(log.details)
                            .filter(([, v]) => v !== null && v !== "")
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <span key={k}>
                                <span className="text-slate-500">{k}:</span>{" "}
                                <span>{String(v).slice(0, 60)}</span>
                              </span>
                            ))}
                        </div>
                      )}
                      {!log.success && log.error_message && (
                        <p className="mt-1 text-xs text-red-400">
                          {log.error_type && <span className="font-medium">{log.error_type}: </span>}
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
