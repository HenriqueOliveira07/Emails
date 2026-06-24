"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  sent: { icon: CheckCircle, color: "text-green-400", label: "Enviado" },
  failed: { icon: XCircle, color: "text-red-400", label: "Falhou" },
  pending: { icon: Clock, color: "text-yellow-400", label: "Pendente" },
};

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-page"],
    queryFn: () => fetchNotifications(100),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-400" />
              <h2 className="text-slate-200 font-semibold">Histórico de Notificações WhatsApp</h2>
              <span className="ml-auto text-slate-400 text-sm">{notifications.length} registros</span>
            </div>
            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-slate-400 py-12">Nenhuma notificação registrada.</div>
            ) : (
              <div className="divide-y divide-slate-700">
                {notifications.map((n) => {
                  const s = STATUS_MAP[n.status] ?? STATUS_MAP.pending;
                  const Icon = s.icon;
                  return (
                    <div key={n.id} className="px-5 py-4 flex items-start gap-4">
                      <Icon size={16} className={`${s.color} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                          <span className="text-slate-400 text-xs">{n.recipient}</span>
                          {n.retry_count > 0 && (
                            <span className="text-slate-500 text-xs">{n.retry_count} tentativa(s)</span>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-4">
                          {n.message_body}
                        </p>
                        {n.error_message && (
                          <p className="text-red-400 text-xs mt-1">{n.error_message}</p>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs flex-shrink-0">
                        {n.sent_at
                          ? format(new Date(n.sent_at), "dd/MM HH:mm", { locale: ptBR })
                          : n.created_at
                          ? format(new Date(n.created_at), "dd/MM HH:mm", { locale: ptBR })
                          : "—"}
                      </div>
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
