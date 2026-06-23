"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const fetchAllNotifications = (limit = 100): Promise<NotificationItem[]> =>
  api.get(`/notifications?limit=${limit}`).then((r) => r.data);

const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

function StatusBadge({ status }: { status: string }) {
  if (status === "enviado")
    return (
      <span className="flex items-center gap-1 text-green-400 text-xs">
        <CheckCircle size={12} /> Enviado
      </span>
    );
  if (status === "falhou")
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs">
        <XCircle size={12} /> Falhou
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-yellow-400 text-xs">
      <Clock size={12} /> Pendente
    </span>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 15_000,
  });

  const { mutate: retry } = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  async function handleSendManual() {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Send size={14} /> Enviar mensagem WhatsApp manual
            </h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Mensagem para enviar via WhatsApp..."
                rows={3}
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendManual}
                disabled={sending || !manualMsg.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-xs text-white font-medium self-end transition-colors"
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Histórico de Notificações ({notifications.length})
              </h3>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Nenhuma notificação enviada ainda
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.map((n) => (
                  <div key={n.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="mt-0.5">
                      <StatusBadge status={n.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                        {n.message_body}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>Para: {n.recipient}</span>
                        {n.sent_at && (
                          <span>
                            {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </span>
                        )}
                        {n.retry_count > 0 && (
                          <span className="text-yellow-500">{n.retry_count} tentativa(s)</span>
                        )}
                        {n.error_message && (
                          <span className="text-red-400 truncate max-w-xs">{n.error_message}</span>
                        )}
                      </div>
                    </div>
                    {n.status === "falhou" && (
                      <button
                        onClick={() => retry(n.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors shrink-0"
                      >
                        <RefreshCw size={11} /> Reenviar
                      </button>
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
