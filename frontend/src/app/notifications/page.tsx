"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    enviado: {
      label: "Enviado",
      cls: "bg-green-500/20 text-green-400 border-green-500/30",
      icon: <CheckCircle size={12} />,
    },
    falhou: {
      label: "Falhou",
      cls: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: <XCircle size={12} />,
    },
    pendente: {
      label: "Pendente",
      cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      icon: <Clock size={12} />,
    },
    reenvio: {
      label: "Reenvio",
      cls: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: <RefreshCw size={12} />,
    },
  };
  const cfg = map[status] ?? map.pendente;
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 30_000,
  });

  const retry = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <MessageCircle size={20} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{notifications.length}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{sent}</p>
                <p className="text-xs text-slate-400">Enviadas</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{failed}</p>
                <p className="text-xs text-slate-400">Falhas</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações WhatsApp</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Destinatário</th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Enviado em</th>
                    <th className="px-4 py-3 text-center">Tentativas</th>
                    <th className="px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Carregando notificações...
                      </td>
                    </tr>
                  )}
                  {!isLoading && notifications.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Nenhuma notificação registrada
                      </td>
                    </tr>
                  )}
                  {notifications.map((n) => (
                    <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-slate-400 text-xs">#{n.id}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs font-mono">{n.recipient}</td>
                      <td className="px-4 py-3 max-w-[300px]">
                        <p className="text-slate-300 text-xs truncate">{n.message_body}</p>
                        {n.error_message && (
                          <p className="text-red-400 text-xs mt-0.5 truncate">{n.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {n.sent_at
                          ? format(new Date(n.sent_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })
                          : n.created_at
                          ? format(new Date(n.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400 text-xs">
                        {n.retry_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.status === "falhou" && (
                          <button
                            onClick={() => retry.mutate(n.id)}
                            disabled={retry.isPending}
                            className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-md transition-colors disabled:opacity-50 border border-blue-500/30"
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
          </div>
        </main>
      </div>
    </div>
  );
}
