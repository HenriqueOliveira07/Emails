"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-yellow-400" />;
};

const statusColors: Record<string, string> = {
  enviado: "bg-green-500/20 text-green-400",
  falhou: "bg-red-500/20 text-red-400",
  pendente: "bg-yellow-500/20 text-yellow-400",
  reenvio: "bg-blue-500/20 text-blue-400",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["all-notifications"],
    queryFn: () => api.get("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setManualMsg("");
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
    } finally {
      setSending(false);
    }
  }

  const failed = notifications.filter((n) => n.status === "falhou");
  const sent = notifications.filter((n) => n.status === "enviado");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{notifications.length}</p>
              <p className="text-sm text-slate-400 mt-1">Total</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{sent.length}</p>
              <p className="text-sm text-slate-400 mt-1">Enviadas</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{failed.length}</p>
              <p className="text-sm text-slate-400 mt-1">Com falha</p>
            </div>
          </div>

          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Send size={14} className="text-blue-400" />
              Envio Manual de Mensagem
            </h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem a enviar via WhatsApp..."
                rows={3}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                onClick={sendManual}
                disabled={sending || !manualMsg.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-xs text-white font-medium transition-colors self-end"
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
              {failed.length > 0 && (
                <span className="text-xs text-red-400">{failed.length} com falha</span>
              )}
            </div>

            {isLoading && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            )}

            <div className="divide-y divide-slate-700/50">
              {notifications.map((n) => (
                <div key={n.id} className="px-5 py-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <StatusIcon status={n.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[n.status] ?? "bg-slate-600 text-slate-300"}`}>
                        {n.status}
                      </span>
                      <span className="text-xs text-slate-500">{n.channel}</span>
                      <span className="text-xs text-slate-500">{n.recipient}</span>
                      {n.sent_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {n.retry_count > 0 && (
                        <span className="text-xs text-orange-400">tentativas: {n.retry_count}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                      {n.message_body}
                    </p>
                    {n.error_message && (
                      <p className="text-xs text-red-400 mt-1">{n.error_message}</p>
                    )}
                    {n.external_id && (
                      <p className="text-xs text-slate-500 mt-1">ID: {n.external_id}</p>
                    )}
                  </div>
                  {n.status === "falhou" && (
                    <button
                      onClick={() => retryMutation.mutate(n.id)}
                      disabled={retryMutation.isPending}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs transition-colors"
                    >
                      <RefreshCw size={11} />
                      Reenviar
                    </button>
                  )}
                </div>
              ))}
              {!isLoading && notifications.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhuma notificação encontrada
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
