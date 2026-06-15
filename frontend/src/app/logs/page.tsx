"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogItem {
  id: number;
  action: string;
  success: boolean;
  duration_ms: number | null;
  timestamp: string;
  error_type: string;
  error_message: string;
  details: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<string, string> = {
  email_processed: "E-mail processado",
  email_ignored: "E-mail ignorado",
  attachment_saved: "Anexo salvo",
  whatsapp_sent: "WhatsApp enviado",
  cycle_complete: "Ciclo completo",
  system_error: "Erro do sistema",
};

export default function LogsPage() {
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");

  const { data: logs = [], isLoading } = useQuery<LogItem[]>({
    queryKey: ["processing-logs"],
    queryFn: () => api.get("/dashboard/processing-logs?limit=200").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const filtered = logs.filter((l) => {
    if (filter === "success") return l.success;
    if (filter === "error") return !l.success;
    return true;
  });

  const successCount = logs.filter((l) => l.success).length;
  const errorCount = logs.filter((l) => !l.success).length;
  const avgDuration = logs
    .filter((l) => l.duration_ms != null)
    .reduce((sum, l, _, arr) => sum + (l.duration_ms ?? 0) / arr.length, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Logs do Sistema" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{logs.length}</p>
              <p className="text-sm text-slate-400 mt-1">Total de eventos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{successCount}</p>
              <p className="text-sm text-slate-400 mt-1">Sucesso</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              <p className="text-sm text-slate-400 mt-1">Erros</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">
                {avgDuration > 0 ? `${avgDuration.toFixed(0)}ms` : "—"}
              </p>
              <p className="text-sm text-slate-400 mt-1">Tempo médio</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            {(["all", "success", "error"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                {f === "all" ? "Todos" : f === "success" ? "Sucesso" : "Erros"}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400 self-center">
              {filtered.length} evento(s)
            </span>
          </div>

          {/* Lista de logs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {isLoading && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            )}
            <div className="divide-y divide-slate-700/50">
              {filtered.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {log.success ? (
                      <CheckCircle size={14} className="text-green-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {log.duration_ms != null && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Activity size={10} />
                          {log.duration_ms.toFixed(0)}ms
                        </span>
                      )}
                      <span className="text-xs text-slate-500 ml-auto">
                        {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {Object.entries(log.details).map(([k, v]) => (
                          <span key={k} className="text-xs text-slate-400">
                            <span className="text-slate-500">{k}:</span>{" "}
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                    {!log.success && log.error_message && (
                      <p className="text-xs text-red-400 mt-1">
                        {log.error_type && <span className="font-medium">{log.error_type}: </span>}
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {!isLoading && filtered.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhum log encontrado
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
