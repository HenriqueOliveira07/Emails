"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { clsx } from "clsx";

const STATUS_LABELS: Record<string, string> = {
  enviado: "Enviado",
  falhou: "Falhou",
  pendente: "Pendente",
  reenvio: "Reenvio",
};

function StatusBadge({ status }: { status: string }) {
  const cls = {
    enviado: "bg-green-500/20 text-green-400 border-green-500/30",
    falhou: "bg-red-500/20 text-red-400 border-red-500/30",
    pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    reenvio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  }[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30";

  const Icon =
    status === "enviado" ? CheckCircle :
    status === "falhou" ? XCircle :
    Clock;

  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border", cls)}>
      <Icon size={10} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function NotificationsPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-list"],
    queryFn: () => api.get("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-list"] }),
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    } finally {
      setSending(false);
    }
  }

  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: notifications.length, cls: "text-white" },
              { label: "Enviadas", value: sent, cls: "text-green-400" },
              { label: "Falhas", value: failed, cls: "text-red-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={clsx("text-2xl font-bold", cls)}>{value}</p>
                <p className="text-sm text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Manual send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar Mensagem Manual</h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem WhatsApp..."
                rows={3}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
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

          {/* Notification list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.length === 0 && (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    Nenhuma notificação registrada
                  </div>
                )}
                {notifications.map((n) => (
                  <div key={n.id}>
                    <div
                      className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
                      onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={n.status} />
                          <span className="text-xs text-slate-500">
                            {n.channel.toUpperCase()}
                          </span>
                          {n.retry_count > 0 && (
                            <span className="text-xs text-orange-400">
                              {n.retry_count} reenvio(s)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 truncate">{n.message_body}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">Para: {n.recipient}</span>
                          {n.sent_at && (
                            <span className="text-xs text-slate-500">
                              {format(new Date(n.sent_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                      {n.status === "falhou" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryMutation.mutate(n.id);
                          }}
                          disabled={retryMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs text-white shrink-0 transition-colors"
                        >
                          <RefreshCw size={10} />
                          Reenviar
                        </button>
                      )}
                    </div>
                    {expandedId === n.id && (
                      <div className="px-5 pb-4 bg-slate-900/50">
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900 rounded p-3 max-h-48 overflow-y-auto">
                          {n.message_body}
                        </pre>
                        {n.error_message && (
                          <p className="text-xs text-red-400 mt-2">Erro: {n.error_message}</p>
                        )}
                        {n.external_id && (
                          <p className="text-xs text-slate-500 mt-1">ID externo: {n.external_id}</p>
                        )}
                      </div>
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
