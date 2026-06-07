"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessingLogItem {
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
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
};

export default function LogsPage() {
  const { data: logs = [], isLoading } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const errors = logs.filter((l) => !l.success).length;
  const success = logs.filter((l) => l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Clock size={20} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{logs.length}</p>
                <p className="text-xs text-slate-400">Total de Eventos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{success}</p>
                <p className="text-xs text-slate-400">Sucesso</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{errors}</p>
                <p className="text-xs text-slate-400">Erros</p>
              </div>
            </div>
          </div>

          {/* Tabela de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Eventos de Processamento</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando logs...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left w-8"></th>
                      <th className="px-4 py-3 text-left">Evento</th>
                      <th className="px-4 py-3 text-left">Detalhes</th>
                      <th className="px-4 py-3 text-left">Tempo</th>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Nenhum evento registrado
                        </td>
                      </tr>
                    )}
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {log.success ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-200 font-medium">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          {log.error_message && (
                            <div className="text-xs text-red-400 mt-0.5">{log.error_message}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">
                          {log.details && Object.keys(log.details).length > 0 ? (
                            <div className="space-y-0.5">
                              {Object.entries(log.details).slice(0, 3).map(([k, v]) => (
                                <div key={k}>
                                  <span className="text-slate-500">{k}:</span>{" "}
                                  <span className="text-slate-300 truncate">{String(v).slice(0, 50)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {log.duration_ms != null ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
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
