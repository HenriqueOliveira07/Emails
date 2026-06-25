"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Activity, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  error: "Erro",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

const ACTION_COLORS: Record<string, string> = {
  email_processed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  email_ignored: "bg-slate-600/40 text-slate-400 border-slate-600/40",
  attachment_saved: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  whatsapp_sent: "bg-green-500/20 text-green-400 border-green-500/30",
  cycle_complete: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
};

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        ACTION_COLORS[action] ?? "bg-slate-700 text-slate-300 border-slate-600"
      )}
    >
      {actionLabel(action)}
    </span>
  );
}

export default function LogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 30_000,
  });

  const items: ProcessingLogItem[] = logs ?? [];
  const successes = items.filter((l) => l.success).length;
  const failures = items.filter((l) => !l.success).length;
  const avgDuration =
    items.filter((l) => l.duration_ms).reduce((sum, l) => sum + (l.duration_ms ?? 0), 0) /
    (items.filter((l) => l.duration_ms).length || 1);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Total de Eventos",
                value: items.length,
                icon: Activity,
                color: "text-blue-400",
              },
              {
                label: "Sucesso",
                value: successes,
                icon: CheckCircle,
                color: "text-green-400",
              },
              {
                label: "Falhas",
                value: failures,
                icon: XCircle,
                color: "text-red-400",
              },
              {
                label: "Tempo Médio",
                value: `${avgDuration.toFixed(0)}ms`,
                icon: Clock,
                color: "text-yellow-400",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={color} />
                  <p className="text-slate-400 text-xs">{label}</p>
                </div>
                <p className={clsx("text-2xl font-bold", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Log table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-white font-semibold text-sm">
                Eventos ({items.length})
              </h2>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400">Carregando logs...</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-slate-400">Nenhum log registrado.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3 w-48">Ação</th>
                    <th className="px-4 py-3">Detalhes</th>
                    <th className="px-4 py-3 w-24">Duração</th>
                    <th className="px-4 py-3 w-36">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
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
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3">
                        {!log.success && log.error_message ? (
                          <p className="text-red-400 text-xs">{log.error_message}</p>
                        ) : log.details && Object.keys(log.details).length > 0 ? (
                          <p className="text-slate-400 text-xs font-mono truncate max-w-[400px]">
                            {JSON.stringify(log.details)}
                          </p>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {log.duration_ms != null ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 text-xs">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss")}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {formatDistanceToNow(new Date(log.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
