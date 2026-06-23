"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogItem {
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

const fetchLogs = (limit = 100): Promise<LogItem[]> =>
  api.get(`/dashboard/processing-logs?limit=${limit}`).then((r) => r.data);

export default function LogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["processing-logs"],
    queryFn: () => fetchLogs(200),
    refetchInterval: 10_000,
  });

  const successCount = logs.filter((l) => l.success).length;
  const errorCount = logs.filter((l) => !l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{logs.length}</p>
              <p className="text-xs text-slate-400 mt-1">Total de registros</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{successCount}</p>
              <p className="text-xs text-slate-400 mt-1">Sucesso</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              <p className="text-xs text-slate-400 mt-1">Erros</p>
            </div>
          </div>

          {/* Tabela de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
              <FileText size={14} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-white">Eventos do Sistema</h3>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando logs...</div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Nenhum log registrado ainda
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Ação</th>
                      <th className="px-4 py-3 text-left">Detalhes</th>
                      <th className="px-4 py-3 text-left">Duração</th>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {log.success ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-300">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          {log.error_message ? (
                            <span className="text-xs text-red-400 truncate block">
                              {log.error_message}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-mono truncate block">
                              {log.details
                                ? Object.entries(log.details)
                                    .slice(0, 2)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(" · ")
                                : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {log.duration_ms != null
                            ? `${log.duration_ms.toFixed(0)} ms`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
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
