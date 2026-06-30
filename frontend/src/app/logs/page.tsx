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
  error_type: string;
  error_message: string;
  details: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo concluído",
  system_error: "Erro do sistema",
};

export default function LogsPage() {
  const { data: logs, isLoading } = useQuery<ProcessingLog[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 15_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Eventos do Sistema</h3>
              <span className="text-xs text-slate-400">{logs?.length ?? 0} eventos</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando logs...</div>
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
                      <th className="px-4 py-3 text-left">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs ?? []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Nenhum log encontrado
                        </td>
                      </tr>
                    )}
                    {(logs ?? []).map((log) => (
                      <tr
                        key={log.id}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/20 ${
                          !log.success ? "bg-red-500/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          {log.success ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs font-medium whitespace-nowrap">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">
                          {log.details
                            ? Object.entries(log.details)
                                .slice(0, 3)
                                .map(([k, v]) => (
                                  <span key={k} className="mr-2">
                                    <span className="text-slate-500">{k}:</span>{" "}
                                    <span className="text-slate-300">{String(v)}</span>
                                  </span>
                                ))
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {log.duration_ms != null ? `${log.duration_ms.toFixed(0)} ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">
                          {log.error_message || "—"}
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
