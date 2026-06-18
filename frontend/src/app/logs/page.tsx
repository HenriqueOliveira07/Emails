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
  details: Record<string, unknown>;
}

async function fetchLogs(): Promise<ProcessingLog[]> {
  return api.get("/dashboard/processing-logs?limit=100").then((r) => r.data);
}

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  system_error: "Erro do sistema",
};

export default function LogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["processing-logs"],
    queryFn: fetchLogs,
    refetchInterval: 15_000,
  });

  const errors = logs.filter((l) => !l.success).length;
  const cycles = logs.filter((l) => l.action === "cycle_complete").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-white">{logs.length}</p>
              <p className="text-sm text-slate-400">Eventos registrados</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-red-400">{errors}</p>
              <p className="text-sm text-slate-400">Erros</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-blue-400">{cycles}</p>
              <p className="text-sm text-slate-400">Ciclos completados</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Últimos 100 eventos</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando logs...</div>
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
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Nenhum log encontrado
                        </td>
                      </tr>
                    )}
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          {log.success ? (
                            <CheckCircle size={14} className="text-green-400" />
                          ) : (
                            <XCircle size={14} className="text-red-400" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {ACTION_LABELS[log.action] || log.action}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">
                          {log.error_message ? (
                            <span className="text-red-400">{log.error_message}</span>
                          ) : (
                            <span className="truncate block">
                              {log.details?.sender
                                ? `${log.details.sender}`
                                : log.details?.filename
                                ? `${log.details.filename}`
                                : log.details?.emails_processed !== undefined
                                ? `${log.details.emails_processed} processados, ${log.details.emails_ignored} ignorados`
                                : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {log.duration_ms != null ? `${log.duration_ms.toFixed(0)} ms` : "—"}
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
