"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

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
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  system_error: "Erro do sistema",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "text-blue-400 bg-blue-500/10",
  email_ignored: "text-slate-400 bg-slate-500/10",
  attachment_saved: "text-purple-400 bg-purple-500/10",
  whatsapp_sent: "text-green-400 bg-green-500/10",
  cycle_complete: "text-cyan-400 bg-cyan-500/10",
  system_error: "text-red-400 bg-red-500/10",
};

export default function LogsPage() {
  const [filter, setFilter] = useState("");

  const { data: logs, isLoading, refetch } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const filtered = filter
    ? logs?.filter((l) => l.action === filter || (!l.success && filter === "errors"))
    : logs;

  const errorCount = logs?.filter((l) => !l.success).length ?? 0;
  const actions = [...new Set(logs?.map((l) => l.action) ?? [])];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total de eventos", value: logs?.length ?? "—", color: "text-white" },
              { label: "Sucessos", value: (logs?.length ?? 0) - errorCount, color: "text-green-400" },
              { label: "Erros", value: errorCount, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: "", label: "Todos" },
              { value: "errors", label: "Erros" },
              ...actions.map((a) => ({ value: a, label: ACTION_LABELS[a] || a })),
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => refetch()}
              className="ml-auto px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
            >
              Atualizar
            </button>
          </div>

          {/* Log list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                Eventos de Processamento
                <span className="ml-2 text-slate-400 font-normal text-xs">({filtered?.length ?? 0})</span>
              </h3>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400">Carregando...</div>
            ) : filtered?.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Nenhum evento encontrado</div>
            ) : (
              <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
                {filtered?.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                    {log.success ? (
                      <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            ACTION_COLORS[log.action] ?? "text-slate-400 bg-slate-500/10"
                          }`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {log.duration_ms !== null && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={10} />
                            {log.duration_ms.toFixed(0)} ms
                          </span>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">
                          {log.timestamp
                            ? format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })
                            : "—"}
                        </span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                          {Object.entries(log.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" | ")}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-red-400 mt-1">
                          {log.error_type && <strong>{log.error_type}: </strong>}
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
