"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationsAll, retryNotification, sendManualNotification, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
    enviado: { icon: CheckCircle, color: "text-green-400 bg-green-500/10 border-green-500/30", label: "Enviado" },
    falhou: { icon: XCircle, color: "text-red-400 bg-red-500/10 border-red-500/30", label: "Falhou" },
    pendente: { icon: Clock, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", label: "Pendente" },
  };
  const { icon: Icon, color, label } = map[status] ?? map.pendente;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${color}`}>
      <Icon size={11} />
      {label}
    </span>
  );
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: () => fetchNotificationsAll(200),
    refetchInterval: 30_000,
  });

  const notifications: NotificationItem[] = data ?? [];

  const retryMutation = useMutation({
    mutationFn: (id: number) => retryNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-all"] }),
  });

  async function handleManualSend() {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await sendManualNotification(0, manualMsg.trim());
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["notifications-all"] });
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
          {/* Manual Send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar Notificação Manual via WhatsApp</h3>
            <div className="flex gap-2">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem a ser enviada..."
                rows={3}
                className="flex-1 bg-slate-700 border border-slate-600 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleManualSend}
                disabled={sending || !manualMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors self-start"
              >
                <Send size={14} className={sending ? "animate-pulse" : ""} />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
              <span className="text-xs text-slate-400">{notifications.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Canal</th>
                    <th className="px-4 py-3 text-left">Destinatário</th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Data/Hora</th>
                    <th className="px-4 py-3 text-left">Tentativas</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && notifications.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Nenhuma notificação encontrada
                      </td>
                    </tr>
                  )}
                  {notifications.map((n) => (
                    <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{n.channel}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono">{n.recipient}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-xs">
                        <p className="truncate text-xs">{n.message_body}</p>
                        {n.error_message && (
                          <p className="text-xs text-red-400 mt-0.5 truncate">{n.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {n.sent_at
                          ? format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : n.created_at
                          ? format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-center">
                        {n.retry_count > 0 ? (
                          <span className="text-xs text-orange-400">{n.retry_count}x</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {n.status === "falhou" && (
                          <button
                            onClick={() => retryMutation.mutate(n.id)}
                            disabled={retryMutation.isPending}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded text-xs text-blue-400 transition-colors"
                          >
                            <RefreshCw size={10} />
                            Reenviar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
