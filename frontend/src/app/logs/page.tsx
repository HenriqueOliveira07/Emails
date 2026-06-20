"use client";
import { useState } from "react";
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
  cycle_complete: "Ciclo concluído",
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
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [actionFilter, setActionFilter] = useState("");

  const { data = [], isLoading } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 30_000,
  });

  const filtered = data.filter((log) => {
    if (filter === "success" && !log.success) return false;
    if (filter === "error" && log.success) return false;
    if (actionFilter && log.action !== actionFilter) return false;
    return true;
  });

  const uniqueActions = Array.from(new Set(data.map((l) => l.action)));
  const errorCount = data.filter((l) => !l.success).length;
  const successCount = data.filter((l) => l.success).length;
  const avgDuration = data.filter((l) => l.duration_ms).reduce((s, l) => s + (l.duration_ms ?? 0), 0)
    / (data.filter((l) => l.duration_ms).length || 1);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total", value: data.length, icon: Activity, color: "text-white" },
              { label: "Sucesso", value: successCount, icon: CheckCircle, color: "text-green-400" },
              { label: "Erros", value: errorCount, icon: XCircle, color: "text-red-400" },
              {
                label: "Tempo médio",
                value: avgDuration > 0 ? `${avgDuration.toFixed(0)}ms` : "—",
                icon: Clock,
                color: "text-blue-400",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Icon size={16} className={color} />
                  <div>
                    <p className={clsx("text-xl font-bold", color)}>{value}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "success", "error"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs transition-colors",
                  filter === f ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {f === "all" ? "Todos" : f === "success" ? "Sucesso" : "Erros"}
              </button>
            ))}
            <div className="h-6 w-px bg-slate-700 self-center" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas as ações</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-400">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</div>

          {/* Logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-700/50">
              {isLoading && (
                <div className="px-5 py-10 text-center text-slate-400">Carregando logs...</div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-5 py-10 text-center text-slate-400">Nenhum log encontrado</div>
              )}
              {filtered.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-700/20 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    {log.success
                      ? <CheckCircle size={13} className="text-green-400" />
                      : <XCircle size={13} className="text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx("text-xs font-medium", ACTION_COLORS[log.action] ?? "text-slate-300")}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      {log.duration_ms !== null && (
                        <span className="text-xs text-slate-500">{log.duration_ms.toFixed(0)}ms</span>
                      )}
                      <span className="text-xs text-slate-500">
                        {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-1 text-xs text-slate-400 truncate">
                        {Object.entries(log.details).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="mr-3">
                            <span className="text-slate-500">{k}:</span>{" "}
                            <span>{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {!log.success && log.error_message && (
                      <p className="text-xs text-red-400 mt-0.5 truncate">{log.error_message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
