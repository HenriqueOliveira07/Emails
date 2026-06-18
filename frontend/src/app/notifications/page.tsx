"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

async function fetchAllNotifications(limit = 100): Promise<NotificationItem[]> {
  return api.get(`/notifications?limit=${limit}`).then((r) => r.data);
}

async function retryNotification(id: number) {
  return api.post(`/notifications/${id}/retry`).then((r) => r.data);
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-yellow-400" />;
};

export default function NotificationsPage() {
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 30_000,
  });

  async function handleRetry(id: number) {
    setRetryingId(id);
    try {
      await retryNotification(id);
      refetch();
    } finally {
      setRetryingId(null);
    }
  }

  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-green-400">{sent}</p>
              <p className="text-sm text-slate-400">Enviadas</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-red-400">{failed}</p>
              <p className="text-sm text-slate-400">Falharam</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-white">{notifications.length}</p>
              <p className="text-sm text-slate-400">Total</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações WhatsApp</h3>
            </div>
            <div className="divide-y divide-slate-700/50">
              {notifications.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhuma notificação registrada
                </div>
              )}
              {notifications.map((n) => (
                <div key={n.id} className="px-5 py-4 flex items-start gap-3">
                  <StatusIcon status={n.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-3">
                      {n.message_body}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        n.status === "enviado"
                          ? "bg-green-500/20 text-green-400"
                          : n.status === "falhou"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {n.status}
                      </span>
                      <span className="text-xs text-slate-500">{n.recipient}</span>
                      {n.sent_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {n.retry_count > 0 && (
                        <span className="text-xs text-orange-400">
                          {n.retry_count} tentativa(s)
                        </span>
                      )}
                      {n.error_message && (
                        <span className="text-xs text-red-400 truncate max-w-xs">
                          {n.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                  {n.status === "falhou" && (
                    <button
                      onClick={() => handleRetry(n.id)}
                      disabled={retryingId === n.id}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs text-white transition-colors shrink-0"
                    >
                      <RefreshCw size={10} className={retryingId === n.id ? "animate-spin" : ""} />
                      Reenviar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
