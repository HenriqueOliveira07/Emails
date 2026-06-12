"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo concluído",
  error: "Erro",
};

function LogRow({ log }: { log: ProcessingLogItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    (log.details && Object.keys(log.details).length > 0) ||
    (log.context && Object.keys(log.context).length > 0) ||
    log.error_message;

  return (
    <>
      <tr
        className={clsx(
          "border-b border-slate-700 transition-colors",
          hasDetails && "hover:bg-slate-800/50 cursor-pointer"
        )}
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        <td className="px-4 py-2.5">
          {log.success ? (
            <CheckCircle size={14} className="text-green-400" />
          ) : (
            <XCircle size={14} className="text-red-400" />
          )}
        </td>
        <td className="px-4 py-2.5">
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded font-mono",
            log.success ? "bg-slate-800 text-slate-300" : "bg-red-500/10 text-red-400"
          )}>
            {ACTION_LABELS[log.action] ?? log.action}
          </span>
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
          {format(parseISO(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-500">
          {log.duration_ms != null ? `${log.duration_ms.toFixed(0)} ms` : "—"}
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs">
          {log.error_message ? (
            <span className="text-red-400 line-clamp-1">{log.error_message}</span>
          ) : log.details ? (
            <span className="text-slate-500 line-clamp-1 font-mono">
              {JSON.stringify(log.details).slice(0, 80)}
            </span>
          ) : null}
        </td>
        <td className="px-4 py-2.5 text-center w-8">
          {hasDetails && (
            expanded
              ? <ChevronUp size={12} className="text-slate-500 mx-auto" />
              : <ChevronDown size={12} className="text-slate-500 mx-auto" />
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="bg-slate-800/30">
          <td colSpan={6} className="px-6 py-3">
            <div className="space-y-2">
              {log.error_message && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">Erro</p>
                  <p className="text-xs text-red-300">{log.error_message}</p>
                  {log.error_type && (
                    <p className="text-xs text-slate-500 mt-1">Tipo: {log.error_type}</p>
                  )}
                </div>
              )}
              {log.details && Object.keys(log.details).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Detalhes</p>
                  <pre className="text-xs text-slate-300 bg-slate-900 rounded p-2 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
              {log.context && Object.keys(log.context).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Contexto</p>
                  <pre className="text-xs text-slate-300 bg-slate-900 rounded p-2 overflow-x-auto">
                    {JSON.stringify(log.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function LogsPage() {
  const [successFilter, setSuccessFilter] = useState<"" | "true" | "false">("");
  const [actionFilter, setActionFilter] = useState("");
  const [limit, setLimit] = useState(100);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["processing-logs", limit],
    queryFn: () => fetchProcessingLogs(limit),
    refetchInterval: 30_000,
  });

  const allLogs = logs ?? [];
  const filtered = allLogs.filter((l) => {
    if (successFilter === "true" && !l.success) return false;
    if (successFilter === "false" && l.success) return false;
    if (actionFilter && l.action !== actionFilter) return false;
    return true;
  });

  const errorCount = allLogs.filter((l) => !l.success).length;
  const successCount = allLogs.filter((l) => l.success).length;
  const avgDuration =
    allLogs.filter((l) => l.duration_ms).length > 0
      ? allLogs.reduce((acc, l) => acc + (l.duration_ms ?? 0), 0) / allLogs.filter((l) => l.duration_ms).length
      : 0;

  const uniqueActions = [...new Set(allLogs.map((l) => l.action))];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
              <p className="text-2xl font-bold text-white">{allLogs.length}</p>
              <p className="text-xs text-slate-500">Total de eventos</p>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
              <p className="text-2xl font-bold text-green-400">{successCount}</p>
              <p className="text-xs text-slate-500">Sucesso</p>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              <p className="text-xs text-slate-500">Erros</p>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
              <p className="text-2xl font-bold text-blue-400">{avgDuration.toFixed(0)} ms</p>
              <p className="text-xs text-slate-500">Tempo médio</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              {[
                { value: "" as const, label: "Todos" },
                { value: "true" as const, label: "Sucesso" },
                { value: "false" as const, label: "Erros" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSuccessFilter(value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    successFilter === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas as ações</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value={50}>Últimos 50</option>
              <option value={100}>Últimos 100</option>
              <option value={250}>Últimos 250</option>
              <option value={500}>Últimos 500</option>
            </select>
            <button
              onClick={() => refetch()}
              className="ml-auto p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-white">Logs</span>
              <span className="text-xs text-slate-500 ml-auto">{filtered.length} eventos</span>
            </div>

            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-slate-500 py-12">Nenhum log encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-700">
                      <th className="px-4 py-2 text-left w-8" />
                      <th className="px-4 py-2 text-left">Ação</th>
                      <th className="px-4 py-2 text-left">Timestamp</th>
                      <th className="px-4 py-2 text-left">Duração</th>
                      <th className="px-4 py-2 text-left">Detalhes</th>
                      <th className="px-4 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log) => (
                      <LogRow key={log.id} log={log} />
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
