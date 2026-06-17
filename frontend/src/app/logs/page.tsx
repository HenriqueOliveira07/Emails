"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

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
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  system_error: "Erro do Sistema",
};

export default function LogsPage() {
  const { data: logs = [], isLoading, refetch } = useQuery<LogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const successes = logs.filter((l) => l.success).length;
  const errors = logs.filter((l) => !l.success).length;
  const avgDuration = logs
    .filter((l) => l.duration_ms != null)
    .reduce((acc, l, _, arr) => acc + (l.duration_ms ?? 0) / arr.length, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total de Eventos", value: logs.length, cls: "text-blue-400" },
              { label: "Sucessos", value: successes, cls: "text-green-400" },
              { label: "Erros", value: errors, cls: "text-red-400" },
              { label: "Duração Média", value: avgDuration ? `${avgDuration.toFixed(0)}ms` : "—", cls: "text-slate-300" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
                <p className="text-slate-400 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Eventos de Processamento</h3>
              <button
                onClick={() => refetch()}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Clock size={12} />
                Atualizar
              </button>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Nenhum log registrado</div>
            ) : (
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
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          {log.success ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            "text-xs px-2 py-0.5 rounded font-medium",
                            log.success ? "bg-slate-700 text-slate-300" : "bg-red-500/20 text-red-400"
                          )}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {!log.success && log.error_message ? (
                            <p className="text-red-400 text-xs truncate max-w-[300px]">{log.error_message}</p>
                          ) : log.details && Object.keys(log.details).length > 0 ? (
                            <p className="text-slate-400 text-xs truncate max-w-[300px]">
                              {Object.entries(log.details)
                                .filter(([k]) => !["message_id"].includes(k))
                                .slice(0, 3)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ")}
                            </p>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {log.duration_ms != null ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
