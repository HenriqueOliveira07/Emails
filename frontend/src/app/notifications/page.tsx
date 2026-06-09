"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Clock, RefreshCw, Send, MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const fetchNotificationsAll = (limit = 100): Promise<NotificationItem[]> =>
  api.get(`/notifications?limit=${limit}`).then((r) => r.data);

const retryNotification = (id: number) =>
  api.post(`/notifications/${id}/retry`).then((r) => r.data);

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  enviado: { label: "Enviado", icon: CheckCircle, color: "text-green-400 bg-green-500/20" },
  falhou: { label: "Falhou", icon: XCircle, color: "text-red-400 bg-red-500/20" },
  pendente: { label: "Pendente", icon: Clock, color: "text-yellow-400 bg-yellow-500/20" },
  reenvio: { label: "Reenvio", icon: RefreshCw, color: "text-blue-400 bg-blue-500/20" },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sendingManual, setSendingManual] = useState(false);
  const [manualResult, setManualResult] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: () => fetchNotificationsAll(100),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => retryNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSendingManual(true);
    setManualResult(null);
    try {
      const res = await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setManualResult(res.data.success ? "Mensagem enviada com sucesso!" : "Falha ao enviar mensagem.");
      if (res.data.success) {
        setManualMsg("");
        queryClient.invalidateQueries({ queryKey: ["notifications-all"] });
      }
    } catch {
      setManualResult("Erro ao conectar com a API.");
    } finally {
      setSendingManual(false);
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
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Enviadas", value: sent, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
              { label: "Falharam", value: failed, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
              { label: "Pendentes", value: pending, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={clsx("rounded-xl border p-5", bg)}>
                <p className={clsx("text-3xl font-bold", color)}>{value}</p>
                <p className="text-sm text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Manual send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Send size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Envio Manual de WhatsApp</h3>
            </div>
            <textarea
              value={manualMsg}
              onChange={(e) => setManualMsg(e.target.value)}
              placeholder="Digite a mensagem para enviar via WhatsApp..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 text-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between mt-3">
              {manualResult && (
                <p className={clsx("text-xs", manualResult.includes("sucesso") ? "text-green-400" : "text-red-400")}>
                  {manualResult}
                </p>
              )}
              <div className="ml-auto">
                <button
                  onClick={sendManual}
                  disabled={sendingManual || !manualMsg.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                >
                  <MessageCircle size={12} />
                  {sendingManual ? "Enviando..." : "Enviar WhatsApp"}
                </button>
              </div>
            </div>
          </div>

          {/* Notification list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                Histórico de Notificações ({notifications.length})
              </h3>
            </div>
            {isLoading ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                Nenhuma notificação registrada ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.map((n) => {
                  const cfg = STATUS_CONFIG[n.status] || STATUS_CONFIG.pendente;
                  const Icon = cfg.icon;
                  return (
                    <div key={n.id} className="px-5 py-4 flex items-start gap-4">
                      <div className={clsx("p-1.5 rounded-lg", cfg.color.split(" ")[1])}>
                        <Icon size={14} className={cfg.color.split(" ")[0]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                          {n.message_body}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className={clsx("text-xs px-2 py-0.5 rounded", cfg.color)}>
                            {cfg.label}
                          </span>
                          {n.sent_at && (
                            <span className="text-xs text-slate-500">
                              {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                            </span>
                          )}
                          {n.retry_count > 0 && (
                            <span className="text-xs text-slate-500">
                              Tentativas: {n.retry_count}
                            </span>
                          )}
                          {n.error_message && (
                            <span className="text-xs text-red-400">{n.error_message}</span>
                          )}
                        </div>
                      </div>
                      {n.status === "falhou" && n.retry_count < 3 && (
                        <button
                          onClick={() => retryMutation.mutate(n.id)}
                          disabled={retryMutation.isPending}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-xs transition-colors"
                        >
                          <RefreshCw size={10} />
                          Reenviar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
