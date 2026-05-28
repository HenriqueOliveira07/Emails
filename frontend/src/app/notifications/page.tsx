"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const STATUS_COLOR: Record<string, string> = {
  enviado: "bg-green-500/20 text-green-400 border border-green-500/30",
  falhou: "bg-red-500/20 text-red-400 border border-red-500/30",
  pendente: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  reenvio: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400 shrink-0" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400 shrink-0" />;
  return <Clock size={14} className="text-yellow-400 shrink-0" />;
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 15_000,
  });

  const retry = useMutation({
    mutationFn: (id: number) => retryNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const notifications = data ?? [];
  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;
  const pending = notifications.filter((n) => n.status === "pendente").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Enviadas", value: sent, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
              { label: "Falhas", value: failed, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
              { label: "Pendentes", value: pending, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={clsx("rounded-xl border p-4 flex items-center gap-3", bg)}>
                <MessageCircle size={20} className={color} />
                <div>
                  <p className={clsx("text-2xl font-bold", color)}>{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Destinatário</th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Enviado em</th>
                    <th className="px-4 py-3 text-center">Tentativas</th>
                    <th className="px-4 py-3 text-center">ID Externo</th>
                    <th className="px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td>
                    </tr>
                  )}
                  {!isLoading && notifications.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Nenhuma notificação registrada
                      </td>
                    </tr>
                  )}
                  {notifications.map((n) => (
                    <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={n.status} />
                          <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLOR[n.status] || "text-slate-400")}>
                            {n.status}
                          </span>
                        </div>
                        {n.error_message && (
                          <p className="text-xs text-red-400 mt-1 truncate max-w-[120px]">{n.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{n.recipient}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 text-xs truncate max-w-[280px]">{n.message_body}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {n.sent_at
                          ? format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : n.created_at
                          ? format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-400">{n.retry_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-500 font-mono truncate max-w-[100px] block">
                          {n.external_id || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.status === "falhou" && (
                          <button
                            onClick={() => retry.mutate(n.id)}
                            disabled={retry.isPending}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs transition-colors mx-auto"
                          >
                            <RefreshCw size={10} className={retry.isPending ? "animate-spin" : ""} />
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
