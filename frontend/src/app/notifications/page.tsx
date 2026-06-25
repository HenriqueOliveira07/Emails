"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllNotifications,
  sendManualNotification,
  retryNotification,
  NotificationItem,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  MessageCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

function StatusIcon({ status }: { status: string }) {
  if (status === "enviado")
    return <CheckCircle size={15} className="text-green-400 flex-shrink-0" />;
  if (status === "falhou")
    return <XCircle size={15} className="text-red-400 flex-shrink-0" />;
  return <Clock size={15} className="text-yellow-400 flex-shrink-0" />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    enviado: "bg-green-500/20 text-green-400 border border-green-500/30",
    falhou: "bg-red-500/20 text-red-400 border border-red-500/30",
    pendente: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    reenvio: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        colors[status] ?? "bg-slate-700 text-slate-300"
      )}
    >
      {status}
    </span>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMessage, setManualMessage] = useState("");
  const [manualSent, setManualSent] = useState<string | null>(null);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 30_000,
  });

  const sendManual = useMutation({
    mutationFn: () => sendManualNotification(0, manualMessage),
    onSuccess: (res) => {
      setManualSent(res.success ? "Mensagem enviada com sucesso!" : "Falha no envio.");
      setManualMessage("");
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
    },
  });

  const retry = useMutation({
    mutationFn: (id: number) => retryNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const items: NotificationItem[] = notifications ?? [];
  const sent = items.filter((n) => n.status === "enviado").length;
  const failed = items.filter((n) => n.status === "falhou").length;
  const pending = items.filter((n) => n.status === "pendente").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Enviadas", value: sent, color: "text-green-400" },
              { label: "Falhas", value: failed, color: "text-red-400" },
              { label: "Pendentes", value: pending, color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={clsx("text-3xl font-bold", color)}>{value}</p>
                <p className="text-slate-400 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Manual send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Send size={16} className="text-blue-400" />
              Enviar Mensagem Manual
            </h2>
            <textarea
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              placeholder="Digite a mensagem a enviar via WhatsApp..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
            {manualSent && (
              <p className="text-xs mt-2 text-green-400">{manualSent}</p>
            )}
            <div className="flex justify-end mt-3">
              <button
                onClick={() => { setManualSent(null); sendManual.mutate(); }}
                disabled={!manualMessage.trim() || sendManual.isPending}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <MessageCircle size={14} />
                {sendManual.isPending ? "Enviando..." : "Enviar via WhatsApp"}
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-white font-semibold text-sm">
                Histórico de Notificações ({items.length})
              </h2>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-slate-400">Nenhuma notificação registrada.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3">Mensagem</th>
                    <th className="px-4 py-3 w-24">Status</th>
                    <th className="px-4 py-3 w-32">Enviado</th>
                    <th className="px-4 py-3 w-16 text-center">Tentativas</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((n) => (
                    <tr
                      key={n.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <StatusIcon status={n.status} />
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">
                          {n.message_body}
                        </p>
                        {n.error_message && (
                          <p className="text-red-400 text-xs mt-1">{n.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {n.created_at
                          ? formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400 text-xs">
                        {n.retry_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.status === "falhou" && n.retry_count < 3 && (
                          <button
                            onClick={() => retry.mutate(n.id)}
                            disabled={retry.isPending}
                            className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                            title="Retentar envio"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
