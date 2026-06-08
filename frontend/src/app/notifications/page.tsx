"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    enviado: { icon: <CheckCircle size={12} />, cls: "bg-green-500/20 text-green-400", label: "Enviado" },
    falhou: { icon: <XCircle size={12} />, cls: "bg-red-500/20 text-red-400", label: "Falhou" },
    pendente: { icon: <Clock size={12} />, cls: "bg-yellow-500/20 text-yellow-400", label: "Pendente" },
    reenvio: { icon: <RefreshCw size={12} />, cls: "bg-blue-500/20 text-blue-400", label: "Reenvio" },
  };
  const s = map[status] ?? map["pendente"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-full"],
    queryFn: () => api.get("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-full"] }),
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setSendResult({ ok: res.data.success, msg: res.data.success ? "Mensagem enviada!" : "Falha ao enviar." });
      if (res.data.success) {
        setManualMsg("");
        qc.invalidateQueries({ queryKey: ["notifications-full"] });
      }
    } catch {
      setSendResult({ ok: false, msg: "Erro na requisição." });
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
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats rápidas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: notifications.length, cls: "text-white" },
              { label: "Enviadas", value: sent, cls: "text-green-400" },
              { label: "Falhas", value: failed, cls: "text-red-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Enviar Mensagem Manual</h3>
            <textarea
              value={manualMsg}
              onChange={(e) => setManualMsg(e.target.value)}
              placeholder="Digite a mensagem que será enviada via WhatsApp..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={sendManual}
                disabled={sending || !manualMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <Send size={14} />
                {sending ? "Enviando..." : "Enviar WhatsApp"}
              </button>
              {sendResult && (
                <span className={`text-sm ${sendResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {sendResult.msg}
                </span>
              )}
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma notificação encontrada
                  </div>
                )}
                {notifications.map((n) => (
                  <div key={n.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={n.status} />
                        <span className="text-xs text-slate-500">#{n.id}</span>
                        {n.sent_at && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {n.retry_count > 0 && (
                          <span className="text-xs text-slate-500">{n.retry_count}x tentativa(s)</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {n.message_body}
                      </p>
                      {n.error_message && (
                        <p className="text-xs text-red-400">{n.error_message}</p>
                      )}
                    </div>
                    {n.status === "falhou" && (
                      <button
                        onClick={() => retryMutation.mutate(n.id)}
                        disabled={retryMutation.isPending}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                      >
                        <RefreshCw size={11} />
                        Reenviar
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
