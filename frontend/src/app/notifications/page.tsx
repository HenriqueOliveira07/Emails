"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const fetchNotificationsAll = (limit = 100): Promise<NotificationItem[]> =>
  api.get(`/notifications?limit=${limit}`).then((r) => r.data);

const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

const STATUS_COLORS: Record<string, string> = {
  enviado: "text-green-400 bg-green-500/10 border-green-500/30",
  falhou: "text-red-400 bg-red-500/10 border-red-500/30",
  pendente: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  reenvio: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "text-slate-400 bg-slate-500/10 border-slate-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${color}`}>
      {status === "enviado" && <CheckCircle size={10} />}
      {status === "falhou" && <XCircle size={10} />}
      {(status === "pendente" || status === "reenvio") && <Clock size={10} />}
      {status}
    </span>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchNotificationsAll(100),
    refetchInterval: 15_000,
  });

  const retryMutation = useMutation({
    mutationFn: retryNotification,
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

  const total = data?.length ?? 0;
  const sent = data?.filter((n) => n.status === "enviado").length ?? 0;
  const failed = data?.filter((n) => n.status === "falhou").length ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: total, color: "text-blue-400" },
              { label: "Enviadas", value: sent, color: "text-green-400" },
              { label: "Falhas", value: failed, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Manual send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar Mensagem Manual</h3>
            <div className="flex gap-3">
              <textarea
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                placeholder="Digite a mensagem a enviar via WhatsApp..."
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
              />
              <button
                onClick={sendManual}
                disabled={sending || !manualMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-white text-sm transition-colors self-end"
              >
                <Send size={14} />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
            </div>
            {isLoading && (
              <div className="p-8 text-center text-slate-400">Carregando...</div>
            )}
            <div className="divide-y divide-slate-700/50">
              {!isLoading && (!data || data.length === 0) && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Nenhuma notificação enviada ainda
                </div>
              )}
              {data?.map((n) => (
                <div key={n.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={n.status} />
                      <span className="text-xs text-slate-500">
                        {n.channel.toUpperCase()}
                      </span>
                      {n.sent_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {n.retry_count > 0 && (
                        <span className="text-xs text-yellow-500">
                          {n.retry_count} tentativa(s)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {n.message_body}
                    </p>
                    {n.error_message && (
                      <p className="text-xs text-red-400 mt-1">{n.error_message}</p>
                    )}
                  </div>
                  {n.status === "falhou" && (
                    <button
                      onClick={() => retryMutation.mutate(n.id)}
                      disabled={retryMutation.isPending}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded text-white transition-colors"
                    >
                      <RefreshCw size={10} />
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
