"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

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
  cycle_complete: "Ciclo completo",
  system_error: "Erro de sistema",
};

export default function LogsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["processing-logs"],
    queryFn: () =>
      api.get<ProcessingLog[]>("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const logs = (data ?? []).filter(
    (l) =>
      !filter ||
      l.action.includes(filter) ||
      (l.error_message && l.error_message.toLowerCase().includes(filter.toLowerCase())),
  );

  const successCount = (data ?? []).filter((l) => l.success).length;
  const errorCount = (data ?? []).filter((l) => !l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total de eventos", value: data?.length ?? 0, color: "text-blue-400" },
              { label: "Sucesso", value: successCount, color: "text-green-400" },
              { label: "Erros", value: errorCount, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center"
              >
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Filtrar por ação ou mensagem..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64"
            />
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw size={13} />
              Atualizar
            </button>
            <span className="text-sm text-slate-500 ml-auto">{logs.length} eventos</span>
          </div>

          {/* Log list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {isLoading && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            )}
            <div className="divide-y divide-slate-700/50">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="px-5 py-3 hover:bg-slate-700/20 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-3">
                    {log.success ? (
                      <CheckCircle size={14} className="text-green-400 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-400 shrink-0" />
                    )}
                    <span className="text-sm text-slate-200 flex-1">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    {log.duration_ms != null && (
                      <span className="text-xs text-slate-500">{log.duration_ms.toFixed(0)}ms</span>
                    )}
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </span>
                    {expanded === log.id ? (
                      <ChevronUp size={12} className="text-slate-500" />
                    ) : (
                      <ChevronDown size={12} className="text-slate-500" />
                    )}
                  </div>

                  {!log.success && log.error_message && (
                    <p className="text-xs text-red-400 mt-1 pl-[22px]">{log.error_message}</p>
                  )}

                  {expanded === log.id && log.details && (
                    <div className="mt-2 pl-[22px]">
                      <pre className="text-xs text-slate-400 bg-slate-900/50 rounded p-3 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {!isLoading && logs.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhum log encontrado
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
