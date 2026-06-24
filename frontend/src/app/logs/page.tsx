"use client";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function LogsPage() {
  const { data: logs = [], isLoading } = useQuery<ProcessingLog[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const errors = logs.filter((l) => !l.success).length;
  const successes = logs.filter((l) => l.success).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex gap-4 text-sm">
            <div className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-3 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-slate-400">Sucesso:</span>
              <span className="text-green-400 font-semibold">{successes}</span>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-3 flex items-center gap-2">
              <XCircle size={14} className="text-red-400" />
              <span className="text-slate-400">Erros:</span>
              <span className="text-red-400 font-semibold">{errors}</span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
              <FileText size={16} className="text-blue-400" />
              <h2 className="text-slate-200 font-semibold">Eventos do Sistema</h2>
            </div>
            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : logs.length === 0 ? (
              <div className="text-center text-slate-400 py-12">Nenhum log registrado.</div>
            ) : (
              <div className="font-mono text-xs divide-y divide-slate-700/50">
                {logs.map((log) => (
                  <div key={log.id} className={`px-5 py-2.5 flex items-start gap-3 ${!log.success ? "bg-red-950/20" : ""}`}>
                    {log.success ? (
                      <CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <span className="text-slate-500 flex-shrink-0 w-32">
                      {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </span>
                    <span className="text-blue-400 flex-shrink-0 w-40 truncate">{log.action}</span>
                    <span className="text-slate-300 flex-1 truncate">
                      {log.error_message || (log.details ? JSON.stringify(log.details) : "OK")}
                    </span>
                    {log.duration_ms != null && (
                      <span className="text-slate-500 flex-shrink-0">{log.duration_ms.toFixed(0)}ms</span>
                    )}
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
