"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Filter } from "lucide-react";
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
  email_processed: "text-blue-400",
  email_ignored: "text-slate-400",
  attachment_saved: "text-purple-400",
  whatsapp_sent: "text-green-400",
  cycle_complete: "text-cyan-400",
  system_error: "text-red-400",
};

export default function LogsPage() {
  const [filter, setFilter] = useState("");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: logs = [], isLoading } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(500),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const filtered = logs.filter((l) => {
    if (showOnlyErrors && l.success) return false;
    if (filter && !l.action.includes(filter) && !JSON.stringify(l.details).toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const errCount = logs.filter((l) => !l.success).length;
  const successRate = logs.length > 0 ? ((logs.filter((l) => l.success).length / logs.length) * 100).toFixed(1) : "—";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-300">{logs.length}</p>
              <p className="text-xs text-slate-400 mt-1">Total de eventos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{errCount}</p>
              <p className="text-xs text-slate-400 mt-1">Erros</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{successRate}%</p>
              <p className="text-xs text-slate-400 mt-1">Taxa de sucesso</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Filter size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="filtrar por ação ou conteúdo..."
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-300">Apenas erros</span>
            </label>
          </div>

          {/* Log Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${filtered.length} eventos`}
              </h3>
            </div>
            <div className="divide-y divide-slate-700/50 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 && !isLoading && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  Nenhum log encontrado
                </div>
              )}
              {filtered.map((log) => (
                <>
                  <div
                    key={log.id}
                    className="px-5 py-2.5 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-3">
                      {log.success
                        ? <CheckCircle size={13} className="text-green-400 shrink-0" />
                        : <XCircle size={13} className="text-red-400 shrink-0" />
                      }
                      <span className={clsx("text-xs font-medium min-w-[160px]", ACTION_COLORS[log.action] ?? "text-slate-300")}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-xs text-slate-500 flex-1 truncate">
                        {log.details && typeof log.details === "object"
                          ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")
                          : ""}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        {log.duration_ms != null && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={10} />
                            {log.duration_ms.toFixed(0)}ms
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </span>
                        {expanded === log.id
                          ? <ChevronUp size={12} className="text-slate-400" />
                          : <ChevronDown size={12} className="text-slate-400" />
                        }
                      </div>
                    </div>
                  </div>
                  {expanded === log.id && (
                    <div key={`${log.id}-detail`} className="px-6 py-3 bg-slate-900/50">
                      {!log.success && log.error_message && (
                        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                          <span className="font-medium">{log.error_type}: </span>{log.error_message}
                        </div>
                      )}
                      <pre className="text-xs text-slate-400 overflow-x-auto bg-slate-800 p-3 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
