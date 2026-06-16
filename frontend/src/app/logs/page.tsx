"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

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

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  system_error: "Erro do Sistema",
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
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterAction, setFilterAction] = useState("");
  const [filterSuccess, setFilterSuccess] = useState("");

  const { data: logs = [], isLoading, refetch } = useQuery<ProcessingLog[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const filtered = logs.filter((l) => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterSuccess === "true" && !l.success) return false;
    if (filterSuccess === "false" && l.success) return false;
    return true;
  });

  const errors = logs.filter((l) => !l.success).length;
  const cycles = logs.filter((l) => l.action === "cycle_complete").length;
  const avgDuration =
    logs
      .filter((l) => l.action === "cycle_complete" && l.duration_ms != null)
      .reduce((acc, l) => acc + (l.duration_ms ?? 0), 0) /
    Math.max(logs.filter((l) => l.action === "cycle_complete").length, 1);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{logs.length}</p>
              <p className="text-sm text-slate-400 mt-1">Total de Eventos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{errors}</p>
              <p className="text-sm text-slate-400 mt-1">Erros Registrados</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-cyan-400">
                {cycles > 0 ? `${avgDuration.toFixed(0)}ms` : "—"}
              </p>
              <p className="text-sm text-slate-400 mt-1">Duração Média de Ciclo</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Ação</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Status</label>
              <select
                value={filterSuccess}
                onChange={(e) => setFilterSuccess(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Sucesso</option>
                <option value="false">Falhas</option>
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
            >
              <RefreshCw size={12} /> Atualizar
            </button>
            <span className="text-xs text-slate-500 self-center ml-auto">
              {filtered.length} de {logs.length} eventos
            </span>
          </div>

          {/* Log table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-center w-8">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-right">Duração</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-center w-8"></th>
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
                  {filtered.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3 text-center">
                          {log.success ? (
                            <CheckCircle size={14} className="text-green-400 mx-auto" />
                          ) : (
                            <XCircle size={14} className="text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("font-medium", ACTION_COLORS[log.action] ?? "text-slate-300")}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                          {!log.success && log.error_type && (
                            <span className="ml-2 text-xs text-red-400">{log.error_type}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                          {log.duration_ms != null ? `${log.duration_ms.toFixed(0)}ms` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === log.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr key={`${log.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={5} className="px-5 py-3">
                            {log.error_message && (
                              <p className="text-xs text-red-400 mb-2">Erro: {log.error_message}</p>
                            )}
                            <pre className="text-xs text-slate-400 font-mono bg-slate-900 rounded p-3 overflow-x-auto">
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
