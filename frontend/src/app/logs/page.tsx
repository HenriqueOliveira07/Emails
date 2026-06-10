"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  system_error: "Erro do sistema",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "text-green-400",
  email_ignored: "text-slate-400",
  attachment_saved: "text-blue-400",
  whatsapp_sent: "text-purple-400",
  cycle_complete: "text-cyan-400",
  system_error: "text-red-400",
};

export default function LogsPage() {
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 15_000,
  });

  const filtered = logs.filter((l) => {
    if (filter === "success") return l.success;
    if (filter === "error") return !l.success;
    return true;
  });

  const successCount = logs.filter((l) => l.success).length;
  const errorCount = logs.filter((l) => !l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Activity size={20} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{logs.length}</p>
                <p className="text-xs text-slate-400">Eventos totais</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{successCount}</p>
                <p className="text-xs text-slate-400">Sucessos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{errorCount}</p>
                <p className="text-xs text-slate-400">Erros</p>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex gap-1">
                {(["all", "success", "error"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      "px-3 py-1.5 text-xs rounded-md transition-colors",
                      filter === f
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    )}
                  >
                    {f === "all" ? "Todos" : f === "success" ? "Sucesso" : "Erros"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <Clock size={12} className={isFetching ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
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
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Carregando logs...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                      <td className="px-4 py-2.5">
                        {log.success
                          ? <CheckCircle size={14} className="text-green-400" />
                          : <XCircle size={14} className="text-red-400" />}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={clsx("text-xs font-medium", ACTION_COLORS[log.action] || "text-slate-300")}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[320px]">
                        {log.success ? (
                          <p className="text-xs text-slate-400 truncate">
                            {log.details && Object.entries(log.details)
                              .filter(([k]) => k !== "message_id")
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")
                              .substring(0, 120)}
                          </p>
                        ) : (
                          <p className="text-xs text-red-400 truncate">
                            {log.error_type && <span className="font-medium">{log.error_type}: </span>}
                            {log.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                        {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 text-xs whitespace-nowrap">
                        {log.duration_ms != null ? `${log.duration_ms.toFixed(0)} ms` : "—"}
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
