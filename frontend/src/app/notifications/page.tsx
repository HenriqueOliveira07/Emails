"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { icon: typeof CheckCircle; cls: string; label: string }> = {
    enviado: { icon: CheckCircle, cls: "text-green-400 bg-green-500/10", label: "Enviado" },
    falhou: { icon: XCircle, cls: "text-red-400 bg-red-500/10", label: "Falhou" },
    pendente: { icon: Clock, cls: "text-yellow-400 bg-yellow-500/10", label: "Pendente" },
    reenvio: { icon: RefreshCw, cls: "text-blue-400 bg-blue-500/10", label: "Reenvio" },
  };
  const cfg = map[status] ?? map.pendente;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${cfg.cls}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["all-notifications"],
    queryFn: () => api.get("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSendStatus("sending");
    try {
      await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setSendStatus("ok");
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
    } catch {
      setSendStatus("err");
    } finally {
      setTimeout(() => setSendStatus("idle"), 3000);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Manual send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar Mensagem Manual</h3>
            <div className="flex gap-3">
              <textarea
                rows={3}
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem para enviar via WhatsApp..."
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={sendManual}
                disabled={sendStatus === "sending" || !manualMsg.trim()}
                className="self-end flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                <Send size={14} />
                {sendStatus === "sending" ? "Enviando..." : sendStatus === "ok" ? "Enviado!" : "Enviar"}
              </button>
            </div>
            {sendStatus === "err" && (
              <p className="text-xs text-red-400 mt-2">Erro ao enviar. Verifique as configurações do WhatsApp.</p>
            )}
          </div>

          {/* Notification history */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
              <span className="text-xs text-slate-400">{notifications.length} registros</span>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Nenhuma notificação registrada</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Mensagem</th>
                      <th className="px-4 py-3 text-left">Destinatário</th>
                      <th className="px-4 py-3 text-left">Horário</th>
                      <th className="px-4 py-3 text-left">Tentativas</th>
                      <th className="px-4 py-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((n) => (
                      <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <StatusBadge status={n.status} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-200 text-xs truncate max-w-[320px]">{n.message_body}</p>
                          {n.error_message && (
                            <p className="text-red-400 text-xs mt-0.5 truncate max-w-[320px]">{n.error_message}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{n.recipient}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {n.sent_at
                            ? format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400 text-xs">{n.retry_count}</td>
                        <td className="px-4 py-3 text-center">
                          {n.status === "falhou" && (
                            <button
                              onClick={() => retryMutation.mutate(n.id)}
                              disabled={retryMutation.isPending}
                              className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
                            >
                              Reenviar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
