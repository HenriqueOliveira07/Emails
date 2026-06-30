"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    enviado: "bg-green-500/20 text-green-400",
    falhou: "bg-red-500/20 text-red-400",
    pendente: "bg-yellow-500/20 text-yellow-400",
    reenvio: "bg-blue-500/20 text-blue-400",
  };
  const Icon = status === "enviado" ? CheckCircle : status === "falhou" ? XCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-slate-500/20 text-slate-400"}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data: notifications, isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-full"],
    queryFn: () => api.get("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-full"] }),
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["notifications-full"] });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar Mensagem WhatsApp Manual</h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem para enviar via WhatsApp..."
                rows={3}
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={sendManual}
                disabled={sending || !manualMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors self-start"
              >
                <Send size={14} />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
              <span className="text-xs text-slate-400">{notifications?.length ?? 0} registros</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Canal</th>
                      <th className="px-4 py-3 text-left">Destinatário</th>
                      <th className="px-4 py-3 text-left">Mensagem</th>
                      <th className="px-4 py-3 text-left">Enviado em</th>
                      <th className="px-4 py-3 text-left">Tentativas</th>
                      <th className="px-4 py-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(notifications ?? []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Nenhuma notificação encontrada
                        </td>
                      </tr>
                    )}
                    {(notifications ?? []).map((n) => (
                      <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                        <td className="px-4 py-3 text-slate-300 capitalize">{n.channel}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{n.recipient}</td>
                        <td className="px-4 py-3 text-slate-300 max-w-xs truncate text-xs">
                          {n.message_body}
                          {n.error_message && (
                            <div className="text-red-400 text-xs mt-0.5">{n.error_message}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {n.sent_at
                            ? format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : n.created_at
                            ? format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400 text-xs">{n.retry_count}</td>
                        <td className="px-4 py-3 text-center">
                          {n.status === "falhou" && (
                            <button
                              onClick={() => retryMutation.mutate(n.id)}
                              disabled={retryMutation.isPending}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded text-xs text-white mx-auto"
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
