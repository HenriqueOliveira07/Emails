"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { clsx } from "clsx";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { fetchAllNotifications, retryNotification, NotificationItem } from "@/lib/api";

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "enviado", label: "Enviados" },
  { value: "falhou", label: "Falhou" },
  { value: "pendente", label: "Pendentes" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-yellow-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    enviado: "bg-green-500/20 text-green-400 border-green-500/30",
    falhou: "bg-red-500/20 text-red-400 border-red-500/30",
    pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    reenvio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={clsx("text-xs px-2 py-0.5 rounded-full border font-medium", classes[status] ?? "bg-slate-700 text-slate-400 border-slate-600")}>
      {status}
    </span>
  );
}

function NotificationRow({ notification }: { notification: NotificationItem }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: () => retryNotification(notification.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-page"] }),
  });

  return (
    <>
      <tr
        className="border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <StatusIcon status={notification.status} />
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-white line-clamp-2">{notification.message_body.slice(0, 120)}...</p>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          {notification.recipient}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={notification.status} />
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          {notification.sent_at
            ? format(parseISO(notification.sent_at), "dd/MM HH:mm", { locale: ptBR })
            : notification.created_at
            ? format(parseISO(notification.created_at), "dd/MM HH:mm", { locale: ptBR })
            : "—"}
        </td>
        <td className="px-4 py-3 text-xs text-center">
          {notification.retry_count > 0 && (
            <span className="text-slate-500">{notification.retry_count}x</span>
          )}
        </td>
        <td className="px-4 py-3">
          {notification.status === "falhou" && notification.retry_count < 3 && (
            <button
              onClick={(e) => { e.stopPropagation(); retryMutation.mutate(); }}
              disabled={retryMutation.isPending}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              <RefreshCw size={11} className={retryMutation.isPending ? "animate-spin" : ""} />
              Reenviar
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-800/30">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">Mensagem completa</p>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                {notification.message_body}
              </pre>
              {notification.error_message && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">Erro</p>
                  <p className="text-xs text-red-300">{notification.error_message}</p>
                </div>
              )}
              {notification.external_id && (
                <p className="text-xs text-slate-500">ID externo: {notification.external_id}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const params: Record<string, string | number> = { limit: LIMIT, offset };
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications-page", statusFilter, offset],
    queryFn: () => fetchAllNotifications(params),
    refetchInterval: 30_000,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  const sentCount = items.filter((n) => n.status === "enviado").length;
  const failedCount = items.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats rápidas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: total, color: "text-white", icon: Bell },
              { label: "Enviadas", value: sentCount, color: "text-green-400", icon: CheckCircle },
              { label: "Falhou", value: failedCount, color: "text-red-400", icon: XCircle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-slate-900 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
                <Icon size={20} className={color} />
                <div>
                  <p className={clsx("text-xl font-bold", color)}>{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-2 items-center">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setStatusFilter(value); setOffset(0); }}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  statusFilter === value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => refetch()}
              className="ml-auto p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
              <Send size={16} className="text-green-400" />
              <span className="text-sm font-semibold text-white">Histórico de Notificações</span>
            </div>

            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-slate-500 py-12">Nenhuma notificação encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-700">
                      <th className="px-4 py-2 text-left w-8" />
                      <th className="px-4 py-2 text-left">Mensagem</th>
                      <th className="px-4 py-2 text-left">Destinatário</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Horário</th>
                      <th className="px-4 py-2 text-center">Tentativas</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((n) => (
                      <NotificationRow key={n.id} notification={n} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-700 text-slate-300"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500">
                  {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
                </span>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-700 text-slate-300"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
