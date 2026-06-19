"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs, ProcessingLogItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, RefreshCw, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const ACTION_LABEL: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo concluído",
};

export default function LogsPage() {
  const [filter, setFilter] = useState("");

  const { data: logs = [], isLoading, refetch } = useQuery<ProcessingLogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(200),
    refetchInterval: 30_000,
  });

  const filtered = filter ? logs.filter((l) => l.action === filter) : logs;
  const actions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas as ações</option>
              {actions.map((a) => (
                <option key={a} value={a}>{ACTION_LABEL[a] || a}</option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${filtered.length} registros`}
              </h3>
            </div>
            <div className="divide-y divide-slate-700/50 max-h-[70vh] overflow-y-auto">
              {filtered.length === 0 && !isLoading && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  Nenhum log encontrado
                </div>
              )}
              {filtered.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  {log.success
                    ? <CheckCircle size={14} className="text-green-400 shrink-0 mt-0.5" />
                    : <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white font-medium">
                        {ACTION_LABEL[log.action] || log.action}
                      </span>
                      {log.duration_ms && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={10} />{log.duration_ms.toFixed(0)}ms
                        </span>
                      )}
                      <span className="text-xs text-slate-500 ml-auto">
                        {log.timestamp
                          ? format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR })
                          : "—"}
                      </span>
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-red-400 mt-1 truncate">{log.error_message}</p>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {Object.entries(log.details)
                          .filter(([, v]) => v !== null && v !== "")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
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
