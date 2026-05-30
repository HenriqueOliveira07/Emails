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

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    enviado: { label: "Enviado", cls: "bg-green-500/20 text-green-400", icon: <CheckCircle size={12} /> },
    falhou: { label: "Falhou", cls: "bg-red-500/20 text-red-400", icon: <XCircle size={12} /> },
    pendente: { label: "Pendente", cls: "bg-yellow-500/20 text-yellow-400", icon: <Clock size={12} /> },
    reenvio: { label: "Reenvio", cls: "bg-blue-500/20 text-blue-400", icon: <RefreshCw size={12} /> },
  };
  const c = cfg[status] ?? cfg.pendente;
  return (
    <span className={clsx("flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", c.cls)}>
      {c.icon}
      {c.label}
    </span>
  );
};

export default function NotificationsPage() {
  const [manualMsg, setManualMsg] = useState("");
  const [limit] = useState(100);
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-list", limit],
    queryFn: () => api.get(`/notifications?limit=${limit}`).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-list"] }),
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      api.post("/notifications/manual", { email_id: 0, message }).then((r) => r.data),
    onSuccess: () => {
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{notifications.length}</p>
              <p className="text-xs text-slate-400 mt-1">Total de notificações</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{sent}</p>
              <p className="text-xs text-slate-400 mt-1">Enviadas com sucesso</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{failed}</p>
              <p className="text-xs text-slate-400 mt-1">Com falha</p>
            </div>
          </div>

          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar mensagem manual via WhatsApp</h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem para enviar via WhatsApp..."
                rows={3}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                onClick={() => manualMsg.trim() && sendMutation.mutate(manualMsg.trim())}
                disabled={!manualMsg.trim() || sendMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors h-fit"
              >
                <Send size={14} />
                {sendMutation.isPending ? "Enviando..." : "Enviar"}
              </button>
            </div>
            {sendMutation.isSuccess && (
              <p className="text-xs text-green-400 mt-2">Mensagem enviada com sucesso!</p>
            )}
            {sendMutation.isError && (
              <p className="text-xs text-red-400 mt-2">Erro ao enviar mensagem.</p>
            )}
          </div>

          {/* Log de notificações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Destinatário</th>
                    <th className="px-4 py-3 text-left">Enviado em</th>
                    <th className="px-4 py-3 text-left">Tentativas</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Carregando notificações...
                      </td>
                    </tr>
                  )}
                  {!isLoading && notifications.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhuma notificação encontrada
                      </td>
                    </tr>
                  )}
                  {notifications.map((n) => (
                    <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 text-xs truncate max-w-[280px]">
                          {n.message_body}
                        </p>
                        {n.error_message && (
                          <p className="text-red-400 text-xs mt-0.5 truncate max-w-[280px]">
                            {n.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{n.recipient}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {n.sent_at
                          ? format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs text-center">
                        {n.retry_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.status === "falhou" && (
                          <button
                            onClick={() => retryMutation.mutate(n.id)}
                            disabled={retryMutation.isPending}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs mx-auto transition-colors"
                          >
                            <RefreshCw size={10} />
                            Retentar
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
