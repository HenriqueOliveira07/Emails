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
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  system_error: "Erro do Sistema",
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
  const [filter, setFilter] = useState<"" | "success" | "error">("");
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 15_000,
  });

  const filtered = logs.filter((log: ProcessingLogItem) => {
    if (filter === "success" && !log.success) return false;
    if (filter === "error" && log.success) return false;
    if (actionFilter && log.action !== actionFilter) return false;
    return true;
  });

  const successCount = logs.filter((l: ProcessingLogItem) => l.success).length;
  const errorCount = logs.filter((l: ProcessingLogItem) => !l.success).length;
  const uniqueActions = [...new Set(logs.map((l: ProcessingLogItem) => l.action))];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400 shrink-0" />
              <div>
                <p className="text-xl font-bold text-white">{successCount}</p>
                <p className="text-sm text-slate-400">Sucesso</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-red-400 shrink-0" />
              <div>
                <p className="text-xl font-bold text-white">{errorCount}</p>
                <p className="text-sm text-slate-400">Erros</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Clock size={20} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-xl font-bold text-white">{logs.length}</p>
                <p className="text-sm text-slate-400">Total Registros</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter size={14} className="text-slate-400" />
              <div className="flex gap-1">
                {(["", "success", "error"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                      filter === f
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    )}
                  >
                    {f === "" ? "Todos" : f === "success" ? "Sucesso" : "Erros"}
                  </button>
                ))}
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas ações</option>
                {uniqueActions.map((a) => (
                  <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
                ))}
              </select>
              <div className="ml-auto">
                <button
                  onClick={() => refetch()}
                  className="text-xs px-3 py-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-8">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-right">Duração</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        Carregando logs...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        Nenhum log encontrado
                      </td>
                    </tr>
                  )}
                  {filtered.map((log: ProcessingLogItem) => (
                    <>
                      <tr
                        key={log.id}
                        className="border-b border-slate-700/40 hover:bg-slate-700/20 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          {log.success
                            ? <CheckCircle size={14} className="text-green-400" />
                            : <XCircle size={14} className="text-red-400" />}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("text-xs px-2 py-0.5 rounded font-medium", ACTION_COLORS[log.action] || "text-slate-400 bg-slate-500/10")}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          {log.error_message && (
                            <p className="text-xs text-red-400 mt-1 truncate max-w-xs">{log.error_message}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {log.duration_ms ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {expanded === log.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </td>
                      </tr>
                      {expanded === log.id && log.details && (
                        <tr key={`${log.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={5} className="px-6 py-3">
                            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-all">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
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
