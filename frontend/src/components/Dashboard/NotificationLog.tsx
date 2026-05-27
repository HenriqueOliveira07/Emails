"use client";
import { NotificationItem } from "@/lib/api";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-yellow-400" />;
};

export function NotificationLog({ notifications }: { notifications: NotificationItem[] }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">Notificações WhatsApp</h3>
      </div>
      <div className="divide-y divide-slate-700/50 max-h-72 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="px-5 py-6 text-center text-slate-400 text-sm">
            Nenhuma notificação enviada ainda
          </div>
        )}
        {notifications.map((n) => (
          <div key={n.id} className="px-5 py-3 flex items-start gap-3">
            <StatusIcon status={n.status} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 truncate">{n.message_body}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  n.status === "enviado"
                    ? "bg-green-500/20 text-green-400"
                    : n.status === "falhou"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {n.status}
                </span>
                {n.sent_at && (
                  <span className="text-xs text-slate-500">
                    {format(new Date(n.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                )}
                {n.error_message && (
                  <span className="text-xs text-red-400 truncate">{n.error_message}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
