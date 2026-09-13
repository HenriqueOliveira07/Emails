"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RotateCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_STYLE: Record<string, string> = {
  enviado: "bg-green-500/20 text-green-400",
  falhou: "bg-red-500/20 text-red-400",
  pendente: "bg-yellow-500/20 text-yellow-400",
  reenvio: "bg-blue-500/20 text-blue-400",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-yellow-400" />;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 30_000,
  });

  async function handleRetry(id: number) {
    setRetryingId(id);
    try {
      await retryNotification(id);
      await queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações WhatsApp</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Destinatário</th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Enviado em</th>
                    <th className="px-4 py-3 text-center">Tentativas</th>
                    <th className="px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && (data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhuma notificação enviada ainda
                      </td>
                    </tr>
                  )}
                  {(data ?? []).map((n) => (
                    <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs ${
                            STATUS_STYLE[n.status] ?? "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          <StatusIcon status={n.status} />
                          {n.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{n.recipient}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[360px] truncate">{n.message_body}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {n.sent_at
                          ? format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400">{n.retry_count}</td>
                      <td className="px-4 py-3 text-center">
                        {n.status === "falhou" && (
                          <button
                            onClick={() => handleRetry(n.id)}
                            disabled={retryingId === n.id}
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                          >
                            <RotateCw size={12} className={retryingId === n.id ? "animate-spin" : ""} />
                            Reenviar
                          </button>
                        )}
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
