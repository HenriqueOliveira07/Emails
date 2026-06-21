"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "") + "/api";

interface ProcessingLog {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
}

interface LogsResponse {
  logs: ProcessingLog[];
}

type FilterTab = "all" | "success" | "failure";

function getActionBadge(action: string) {
  const a = (action || "").toLowerCase();
  if (a === "email_processed")
    return { label: "Email Processado", classes: "bg-blue-900 text-blue-300 border-blue-700" };
  if (a === "email_ignored")
    return { label: "Email Ignorado", classes: "bg-slate-700 text-slate-300 border-slate-600" };
  if (a === "attachment_saved")
    return { label: "Anexo Salvo", classes: "bg-purple-900 text-purple-300 border-purple-700" };
  if (a === "whatsapp_sent")
    return { label: "WhatsApp Enviado", classes: "bg-green-900 text-green-300 border-green-700" };
  if (a === "cycle_complete")
    return { label: "Ciclo Completo", classes: "bg-teal-900 text-teal-300 border-teal-700" };
  if (a.includes("error") || a.includes("fail"))
    return { label: action, classes: "bg-red-900 text-red-300 border-red-700" };
  return { label: action, classes: "bg-slate-700 text-slate-300 border-slate-600" };
}

function DetailsCell({ details }: { details: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!details || Object.keys(details).length === 0) {
    return <span className="text-slate-600 text-xs">—</span>;
  }
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {open ? "Ocultar" : "Ver JSON"}
      </button>
      {open && (
        <pre className="mt-2 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 overflow-x-auto max-w-xs max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function LogsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery<LogsResponse>({
    queryKey: ["processing-logs"],
    queryFn: async () => {
      const { data } = await axios.get<LogsResponse>(
        `${API_BASE}/dashboard/processing-logs?limit=100`
      );
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const logs: ProcessingLog[] = data?.logs || [];

  const filtered = logs.filter((log) => {
    if (filter === "success" && !log.success) return false;
    if (filter === "failure" && log.success) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(log.action || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const successCount = logs.filter((l) => l.success).length;
  const failureCount = logs.filter((l) => !l.success).length;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: logs.length },
    { key: "success", label: "Sucesso", count: successCount },
    { key: "failure", label: "Falhas", count: failureCount },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Total de Logs</p>
              <p className="text-2xl font-bold text-white mt-1">{isLoading ? "—" : logs.length}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Sucessos</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {isLoading ? "—" : successCount}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Falhas</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {isLoading ? "—" : failureCount}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900 rounded-md p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={clsx(
                    "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                    filter === tab.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {tab.label}
                  <span
                    className={clsx(
                      "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                      filter === tab.key ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por tipo de ação..."
                className="w-full bg-slate-900 border border-slate-600 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <span className="text-xs text-slate-500 ml-auto">
              Exibindo {filtered.length} de {logs.length} registros
            </span>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Ação
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Sucesso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Duração
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Tipo de Erro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Mensagem
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                        Carregando logs...
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-red-400 text-sm">
                        Erro ao carregar logs. Verifique a conexão com a API.
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-500 text-sm">
                        Nenhum log encontrado para os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log) => {
                      const badge = getActionBadge(log.action);
                      return (
                        <tr
                          key={log.id}
                          className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                            #{log.id}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                "text-xs font-medium px-2 py-0.5 rounded border whitespace-nowrap",
                                badge.classes
                              )}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.success ? (
                              <CheckCircle size={15} className="text-green-400 mx-auto" />
                            ) : (
                              <XCircle size={15} className="text-red-400 mx-auto" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {log.duration_ms != null ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-600 whitespace-nowrap">
                                <Clock size={10} />
                                {log.duration_ms} ms
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                            {log.timestamp
                              ? format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", {
                                  locale: ptBR,
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {log.error_type ? (
                              <span className="text-xs text-red-400 font-mono">{log.error_type}</span>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            {log.error_message ? (
                              <span
                                className="text-xs text-slate-300 truncate block"
                                title={log.error_message}
                              >
                                {log.error_message}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <DetailsCell details={log.details} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
