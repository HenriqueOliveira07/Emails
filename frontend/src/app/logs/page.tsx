"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchProcessingLogs } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function LogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["processing-logs"],
    queryFn: () => fetchProcessingLogs(100),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs de Processamento" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Eventos Recentes</h3>
            </div>
            <div className="divide-y divide-slate-700/50 max-h-[70vh] overflow-y-auto">
              {isLoading && (
                <div className="px-5 py-6 text-center text-slate-400 text-sm">Carregando...</div>
              )}
              {!isLoading && (data ?? []).length === 0 && (
                <div className="px-5 py-6 text-center text-slate-400 text-sm">
                  Nenhum evento registrado ainda
                </div>
              )}
              {(data ?? []).map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  {log.success ? (
                    <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-slate-200 font-medium">{log.action}</span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                      {log.duration_ms != null && (
                        <span className="text-xs text-slate-500">{Math.round(log.duration_ms)}ms</span>
                      )}
                    </div>
                    {!log.success && log.error_message && (
                      <p className="text-xs text-red-400 mt-1 truncate">
                        {log.error_type ? `[${log.error_type}] ` : ""}
                        {log.error_message}
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
