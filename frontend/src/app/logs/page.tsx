"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail Processado",
  email_ignored: "E-mail Ignorado",
  attachment_saved: "Anexo Salvo",
  whatsapp_sent: "WhatsApp Enviado",
  cycle_complete: "Ciclo Completo",
  error: "Erro",
};

const ACTION_COLORS: Record<string, string> = {
  email_processed: "text-blue-400 bg-blue-500/10",
  email_ignored: "text-slate-400 bg-slate-500/10",
  attachment_saved: "text-purple-400 bg-purple-500/10",
  whatsapp_sent: "text-green-400 bg-green-500/10",
  cycle_complete: "text-cyan-400 bg-cyan-500/10",
};

const ALL_ACTIONS = ["Todos", ...Object.keys(ACTION_LABELS)];

export default function LogsPage() {
  const [actionFilter, setActionFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: logs = [], isLoading } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 10_000,
  });

  const successCount = logs.filter((l) => l.success).length;
  const errorCount = logs.filter((l) => !l.success).length;

  let filtered = actionFilter === "Todos" ? logs : logs.filter((l) => l.action === actionFilter);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.action.includes(s) ||
        l.error_message?.toLowerCase().includes(s) ||
        JSON.stringify(l.details).toLowerCase().includes(s)
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{logs.length}</p>
              <p className="text-xs text-slate-400 mt-1">Total de Eventos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{successCount}</p>
              <p className="text-xs text-slate-400 mt-1">Sucesso</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              <p className="text-xs text-slate-400 mt-1">Erros</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar nos logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg p-1">
              {ALL_ACTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => setActionFilter(a)}
                  className={clsx(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    actionFilter === a ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  {a === "Todos" ? "Todos" : (ACTION_LABELS[a] || a)}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Eventos de Processamento</h3>
              <span className="text-xs text-slate-400">{filtered.length} eventos</span>
            </div>
            <div className="divide-y divide-slate-700/50">
              {isLoading && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">Carregando...</div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">Nenhum log encontrado</div>
              )}
              {filtered.map((log) => (
                <>
                  <div
                    key={log.id}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-slate-700/20 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    {log.success ? (
                      <CheckCircle size={16} className="text-green-400 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={clsx(
                            "text-xs px-2 py-0.5 rounded font-medium",
                            ACTION_COLORS[log.action] || "text-slate-400 bg-slate-500/10"
                          )}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {!log.success && log.error_message && (
                          <span className="text-xs text-red-400 truncate max-w-[300px]">{log.error_message}</span>
                        )}
                        {log.details && typeof log.details === "object" && "sender" in log.details && (
                          <span className="text-xs text-slate-400 truncate">{String(log.details.sender)}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-slate-400 whitespace-nowrap">
                        {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </p>
                      {log.duration_ms !== null && log.duration_ms !== undefined && (
                        <p className="text-xs text-slate-500">{Math.round(log.duration_ms)}ms</p>
                      )}
                    </div>
                    {expanded === log.id ? (
                      <ChevronUp size={14} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-400 shrink-0" />
                    )}
                  </div>
                  {expanded === log.id && (
                    <div key={`${log.id}-detail`} className="px-5 py-3 bg-slate-900/50">
                      {log.error_type && (
                        <p className="text-xs text-red-400 mb-2">
                          <span className="font-medium">Tipo de erro:</span> {log.error_type}
                        </p>
                      )}
                      <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap break-words bg-slate-900 rounded-lg p-3 max-h-48">
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
