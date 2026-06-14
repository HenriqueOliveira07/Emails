"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  enviado: { label: "Enviado", icon: CheckCircle, color: "text-green-400" },
  falhou: { label: "Falhou", icon: XCircle, color: "text-red-400" },
  pendente: { label: "Pendente", icon: Clock, color: "text-yellow-400" },
  reenvio: { label: "Reenvio", icon: RefreshCw, color: "text-blue-400" },
};

export default function NotificationsPage() {
  const [limit, setLimit] = useState(50);
  const [manualMsg, setManualMsg] = useState("");
  const [sendingManual, setSendingManual] = useState(false);
  const [manualResult, setManualResult] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-page", limit],
    queryFn: () => fetchNotifications(limit),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
    },
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSendingManual(true);
    setManualResult(null);
    try {
      const result = await api.post("/notifications/manual", {
        email_id: 0,
        message: manualMsg,
      });
      setManualResult(result.data.success ? "Mensagem enviada com sucesso!" : "Falha ao enviar.");
      if (result.data.success) setManualMsg("");
      await refetch();
    } catch {
      setManualResult("Erro ao enviar mensagem.");
    } finally {
      setSendingManual(false);
    }
  }

  const stats = {
    total: notifications.length,
    enviado: notifications.filter((n) => n.status === "enviado").length,
    falhou: notifications.filter((n) => n.status === "falhou").length,
    pendente: notifications.filter((n) => n.status === "pendente").length,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total", value: stats.total, color: "text-white" },
              { label: "Enviadas", value: stats.enviado, color: "text-green-400" },
              { label: "Falhas", value: stats.falhou, color: "text-red-400" },
              { label: "Pendentes", value: stats.pendente, color: "text-yellow-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={clsx("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Send size={14} />
              Enviar Mensagem Manual
            </h3>
            <div className="space-y-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem WhatsApp..."
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={sendManual}
                  disabled={sendingManual || !manualMsg.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Send size={14} className={sendingManual ? "animate-pulse" : ""} />
                  {sendingManual ? "Enviando..." : "Enviar via WhatsApp"}
                </button>
                {manualResult && (
                  <span className={clsx("text-sm", manualResult.includes("sucesso") ? "text-green-400" : "text-red-400")}>
                    {manualResult}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${notifications.length} notificação(ões)`}
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1"
                >
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button
                  onClick={() => refetch()}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-700/50">
              {isLoading && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
              )}
              {!isLoading && notifications.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhuma notificação encontrada
                </div>
              )}
              {notifications.map((n) => {
                const cfg = STATUS_CONFIG[n.status] || STATUS_CONFIG.pendente;
                const StatusIcon = cfg.icon;
                return (
                  <div key={n.id} className="px-5 py-4 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <StatusIcon size={16} className={clsx("mt-0.5 shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={clsx("text-xs px-1.5 py-0.5 rounded font-medium",
                            n.status === "enviado" ? "bg-green-500/20 text-green-400" :
                            n.status === "falhou" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          )}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {n.channel.toUpperCase()}
                          </span>
                          {n.sent_at && (
                            <span className="text-xs text-slate-500">
                              {format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </span>
                          )}
                          {n.retry_count > 0 && (
                            <span className="text-xs text-slate-500">{n.retry_count} reenvio(s)</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.message_body}</p>
                        {n.error_message && (
                          <p className="text-xs text-red-400 mt-1">{n.error_message}</p>
                        )}
                      </div>
                      {n.status === "falhou" && (
                        <button
                          onClick={() => retryMutation.mutate(n.id)}
                          disabled={retryMutation.isPending}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 rounded text-xs text-blue-400 transition-colors"
                        >
                          <RefreshCw size={10} />
                          Reenviar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
