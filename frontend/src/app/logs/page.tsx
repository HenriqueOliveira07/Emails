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

  const logs = data ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Logs de Processamento</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Ação</th>
                    <th className="px-4 py-3 text-left">Data/Hora</th>
                    <th className="px-4 py-3 text-right">Duração</th>
                    <th className="px-4 py-3 text-left">Detalhes / Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Nenhum log registrado ainda
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        {log.success ? (
                          <CheckCircle2 size={14} className="text-green-400" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-200 whitespace-nowrap">{log.action}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                        {log.duration_ms ? `${log.duration_ms.toFixed(0)} ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-[360px] truncate">
                        {log.error_message || "—"}
                      </td>
                    </tr>
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
