"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessingLog {
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
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  system_error: "Erro do sistema",
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
  const { data, isLoading } = useQuery<ProcessingLog[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const logs = data ?? [];
  const errors = logs.filter((l) => !l.success).length;
  const cycles = logs.filter((l) => l.action === "cycle_complete").length;
  const avgDuration = logs.filter((l) => l.duration_ms).reduce((s, l) => s + (l.duration_ms ?? 0), 0)
    / Math.max(1, logs.filter((l) => l.duration_ms).length);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Eventos", value: logs.length, color: "text-blue-400" },
              { label: "Erros", value: errors, color: "text-red-400" },
              { label: "Ciclos", value: cycles, color: "text-cyan-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Eventos de Processamento</h3>
              <span className="text-xs text-slate-400">
                Tempo médio: {avgDuration ? `${avgDuration.toFixed(0)}ms` : "—"}
              </span>
            </div>
            {isLoading && <div className="p-8 text-center text-slate-400">Carregando logs...</div>}
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
                  {logs.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Nenhum log registrado
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        {log.success ? (
                          <CheckCircle size={14} className="text-green-400" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${ACTION_COLORS[log.action] ?? "text-slate-300"}`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        {!log.success && log.error_type && (
                          <p className="text-xs text-red-400 mt-0.5">{log.error_type}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {log.details && (
                          <pre className="text-xs text-slate-400 truncate font-mono">
                            {JSON.stringify(log.details)}
                          </pre>
                        )}
                        {!log.success && log.error_message && (
                          <p className="text-xs text-red-400 truncate">{log.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                        {log.duration_ms ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                        {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
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
