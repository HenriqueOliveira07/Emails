"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchNotifications, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400 shrink-0" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400 shrink-0" />;
  return <Clock size={14} className="text-yellow-400 shrink-0" />;
};

const statusClass = (s: string) => {
  if (s === "enviado") return "bg-green-500/20 text-green-400";
  if (s === "falhou") return "bg-red-500/20 text-red-400";
  return "bg-yellow-500/20 text-yellow-400";
};

export default function NotificationsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: notifications = [], isLoading, refetch } = useQuery<NotificationItem[]>({
    queryKey: ["all-notifications"],
    queryFn: () => fetchNotifications(200),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">
              {isLoading ? "Carregando..." : `${notifications.length} notificações`}
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>

          <div className="space-y-2">
            {notifications.length === 0 && !isLoading && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center text-slate-400">
                Nenhuma notificação enviada ainda
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
              >
                <div
                  className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                >
                  <StatusIcon status={n.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {n.message_body?.split("\n")[0] || "Notificação WhatsApp"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusClass(n.status)}`}>
                        {n.status}
                      </span>
                      <span className="text-xs text-slate-500">{n.recipient}</span>
                      {n.sent_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {n.retry_count > 0 && (
                        <span className="text-xs text-orange-400">{n.retry_count} tentativa(s)</span>
                      )}
                    </div>
                  </div>
                </div>
                {expanded === n.id && (
                  <div className="px-5 pb-4 border-t border-slate-700/50">
                    <pre className="text-xs text-slate-300 mt-3 whitespace-pre-wrap leading-relaxed">
                      {n.message_body}
                    </pre>
                    {n.error_message && (
                      <p className="text-xs text-red-400 mt-2">Erro: {n.error_message}</p>
                    )}
                    {n.external_id && (
                      <p className="text-xs text-slate-500 mt-1">ID externo: {n.external_id}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
