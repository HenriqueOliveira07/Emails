"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  error: "Erro",
};

const ACTION_COLOR: Record<string, string> = {
  email_processed: "text-blue-400",
  email_ignored: "text-slate-400",
  attachment_saved: "text-purple-400",
  whatsapp_sent: "text-green-400",
  cycle_complete: "text-teal-400",
  error: "text-red-400",
};

export default function LogsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 30_000,
  });

  const logs = data ?? [];
  const successes = logs.filter((l) => l.success).length;
  const errors = logs.filter((l) => !l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Activity size={20} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{logs.length}</p>
                <p className="text-xs text-slate-400">Total de registros</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">{successes}</p>
                <p className="text-xs text-slate-400">Sucessos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-400">{errors}</p>
                <p className="text-xs text-slate-400">Erros</p>
              </div>
            </div>
          </div>

          {/* Tabela de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Últimos 200 registros
              </h3>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
              >
                <Clock size={12} className={isFetching ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800 z-10">
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Detalhes</th>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-right">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td>
                    </tr>
                  )}
                  {!isLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        Nenhum log registrado ainda
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className={clsx(
                      "border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors",
                      !log.success && "bg-red-500/5"
                    )}>
                      <td className="px-4 py-2.5">
                        {log.success
                          ? <CheckCircle size={13} className="text-green-400" />
                          : <XCircle size={13} className="text-red-400" />}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={clsx("text-xs font-medium", ACTION_COLOR[log.action] || "text-slate-300")}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {!log.success && log.error_message && (
                          <p className="text-xs text-red-400 mt-0.5 truncate max-w-[200px]">{log.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <div className="text-xs text-slate-400 space-y-0.5">
                            {Object.entries(log.details)
                              .filter(([, v]) => v !== null && v !== undefined && v !== "")
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <span key={k} className="block truncate max-w-[240px]">
                                  <span className="text-slate-500">{k}: </span>
                                  <span className="text-slate-300">{String(v)}</span>
                                </span>
                              ))}
                          </div>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                        {log.timestamp
                          ? format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400 whitespace-nowrap">
                        {log.duration_ms != null ? `${log.duration_ms.toFixed(0)}ms` : "—"}
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
