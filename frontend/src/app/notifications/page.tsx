"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications, NotificationItem, api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, Send, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={16} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={16} className="text-red-400" />;
  return <Clock size={16} className="text-yellow-400" />;
};

export default function NotificationsPage() {
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);

  const { data: notifications = [], refetch } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-full"],
    queryFn: () => fetchNotifications(100),
    refetchInterval: 15_000,
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setManualMsg("");
      refetch();
    } finally {
      setSending(false);
    }
  }

  async function retryNotification(id: number) {
    setRetrying(id);
    try {
      await api.post(`/notifications/${id}/retry`);
      refetch();
    } finally {
      setRetrying(null);
    }
  }

  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;
  const pending = notifications.filter((n) => n.status === "pendente").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{sent}</p>
                <p className="text-xs text-slate-400">Enviadas</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{failed}</p>
                <p className="text-xs text-slate-400">Falharam</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Clock size={20} className="text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{pending}</p>
                <p className="text-xs text-slate-400">Pendentes</p>
              </div>
            </div>
          </div>

          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar Mensagem Manual</h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem para enviar via WhatsApp..."
                rows={3}
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm resize-none"
              />
              <button
                onClick={sendManual}
                disabled={sending || !manualMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors self-start"
              >
                <Send size={14} />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
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
                    <p className="text-sm text-slate-200 line-clamp-2">{n.message_body}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-500">{n.recipient}</span>
                      {n.sent_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {n.retry_count > 0 && (
                        <span className="text-xs text-orange-400">{n.retry_count} tentativa(s)</span>
                      )}
                      {n.error_message && (
                        <span className="text-xs text-red-400">{n.error_message}</span>
                      )}
                    </div>
                  </div>
                  {n.status === "falhou" && (
                    <button
                      onClick={() => retryNotification(n.id)}
                      disabled={retrying === n.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors shrink-0"
                    >
                      <RefreshCw size={11} className={retrying === n.id ? "animate-spin" : ""} />
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
