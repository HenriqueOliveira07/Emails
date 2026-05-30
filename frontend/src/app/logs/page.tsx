"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
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
};

export default function LogsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");

  const { data: logs = [], isLoading } = useQuery<ProcessingLog[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const filtered = logs.filter((log) => {
    if (filter === "success") return log.success;
    if (filter === "error") return !log.success;
    return true;
  });

  const totalSuccess = logs.filter((l) => l.success).length;
  const totalErrors = logs.filter((l) => !l.success).length;
  const avgDuration = logs
    .filter((l) => l.duration_ms)
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
              <p className="text-xs text-slate-400 mt-1">Total de eventos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{totalSuccess}</p>
              <p className="text-xs text-slate-400 mt-1">Com sucesso</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{totalErrors}</p>
              <p className="text-xs text-slate-400 mt-1">Com erros</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">
                {avgDuration > 0 ? `${avgDuration.toFixed(0)}ms` : "—"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Duração média</p>
            </div>
          </div>

          {/* Filtro */}
          <div className="flex gap-2">
            {(["all", "success", "error"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm transition-colors",
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                )}
              >
                {f === "all" ? "Todos" : f === "success" ? "Sucesso" : "Erros"}
              </button>
            ))}
          </div>

          {/* Tabela de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${filtered.length} eventos`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Data/Hora</th>
                    <th className="px-4 py-3 text-left">Duração</th>
                    <th className="px-4 py-3 text-left">Erro</th>
                    <th className="px-4 py-3 text-center"></th>
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
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                  {filtered.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          {log.success ? (
                            <CheckCircle size={16} className="text-green-400" />
                          ) : (
                            <XCircle size={16} className="text-red-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-200 text-xs">
                          {ACTION_LABELS[log.action] || log.action}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {log.timestamp
                            ? format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {log.duration_ms ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {log.error_message ? (
                            <span className="text-red-400 text-xs truncate max-w-[200px] block">
                              {log.error_message}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr key={`${log.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="text-xs space-y-1">
                              {log.error_type && (
                                <p>
                                  <span className="text-slate-500">Tipo de erro: </span>
                                  <span className="text-red-400">{log.error_type}</span>
                                </p>
                              )}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <p className="text-slate-500 mb-1">Detalhes:</p>
                                  <div className="bg-slate-800 rounded p-2 font-mono text-slate-300">
                                    {Object.entries(log.details).map(([k, v]) => (
                                      <div key={k}>
                                        <span className="text-blue-400">{k}:</span>{" "}
                                        {JSON.stringify(v)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
