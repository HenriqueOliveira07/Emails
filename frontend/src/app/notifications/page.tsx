"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  Bell,
} from "lucide-react";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { NotificationItem } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";
const api = axios.create({ baseURL: BASE + "/api" });

type StatusFilter = "todos" | "enviado" | "falhou" | "pendente";

interface RetryResponse {
  success: boolean;
  retry_count: number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    enviado: {
      label: "Enviado",
      cls: "bg-green-500/20 text-green-400",
      icon: <CheckCircle size={11} />,
    },
    falhou: {
      label: "Falhou",
      cls: "bg-red-500/20 text-red-400",
      icon: <XCircle size={11} />,
    },
    pendente: {
      label: "Pendente",
      cls: "bg-yellow-500/20 text-yellow-400",
      icon: <Clock size={11} />,
    },
  };

  const c = cfg[status] ?? {
    label: status,
    cls: "bg-slate-700 text-slate-400",
    icon: null,
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
        c.cls
      )}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ─── Message preview modal ────────────────────────────────────────────────────
function MessageModal({
  notification,
  onClose,
}: {
  notification: NotificationItem;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <p className="text-sm font-semibold text-white">
              Notificação #{notification.id}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Canal: <span className="capitalize">{notification.channel}</span> —{" "}
              {notification.recipient}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5">
              Mensagem
            </p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {notification.message_body || "Sem conteúdo"}
            </p>
          </div>

          {notification.error_message && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
                Erro
              </p>
              <p className="text-xs text-red-300 leading-relaxed">
                {notification.error_message}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1 text-xs text-slate-500">
            <span>
              Status: <StatusBadge status={notification.status} />
            </span>
            <span>Tentativas: {notification.retry_count}</span>
            {notification.sent_at && (
              <span>
                Enviado:{" "}
                {format(new Date(notification.sent_at), "dd/MM/yy HH:mm", {
                  locale: ptBR,
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "yellow";
}) {
  const colorMap = {
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
        {label}
      </p>
      <p className={clsx("text-2xl font-bold", colorMap[color])}>{value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [previewItem, setPreviewItem] = useState<NotificationItem | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const { data: notifications = [], isLoading, isFetching } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-full"],
    queryFn: () => api.get("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation<RetryResponse, Error, number>({
    mutationFn: (id) =>
      api.post<RetryResponse>(`/notifications/${id}/retry`).then((r) => r.data),
    onMutate: (id) => setRetryingId(id),
    onSettled: () => {
      setRetryingId(null);
      queryClient.invalidateQueries({ queryKey: ["notifications-full"] });
    },
  });

  // Derived stats
  const totalSent = notifications.filter((n) => n.status === "enviado").length;
  const totalFailed = notifications.filter((n) => n.status === "falhou").length;
  const totalRetries = notifications.reduce((acc, n) => acc + (n.retry_count ?? 0), 0);

  // Filtered list
  const filtered =
    statusFilter === "todos"
      ? notifications
      : notifications.filter((n) => n.status === statusFilter);

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "enviado", label: "Enviados" },
    { key: "falhou", label: "Falhos" },
    { key: "pendente", label: "Pendentes" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 overflow-y-auto space-y-4">

          {/* ── Stats bar ── */}
          <div className="flex gap-4">
            <StatCard label="Total Enviados" value={totalSent} color="green" />
            <StatCard label="Total Falhos" value={totalFailed} color="red" />
            <StatCard label="Total Retentativas" value={totalRetries} color="yellow" />
          </div>

          {/* ── Status tabs ── */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 w-fit">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  statusFilter === key
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {label}
                {key !== "todos" && (
                  <span className="ml-1.5 text-xs opacity-70">
                    (
                    {key === "enviado"
                      ? totalSent
                      : key === "falhou"
                      ? totalFailed
                      : notifications.filter((n) => n.status === "pendente").length}
                    )
                  </span>
                )}
              </button>
            ))}
            {isFetching && (
              <RefreshCw size={12} className="ml-2 text-slate-500 animate-spin" />
            )}
          </div>

          {/* ── Table ── */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Canal</th>
                    <th className="px-4 py-3 text-left">Destinatário</th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-center">Erros</th>
                    <th className="px-4 py-3 text-center">Retentativas</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Loading */}
                  {isLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        {Array.from({ length: 10 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-slate-700 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {/* Empty */}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <Bell size={32} className="opacity-40" />
                          <p className="text-sm">Nenhuma notificação encontrada</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Data rows */}
                  {!isLoading &&
                    filtered.map((n) => (
                      <>
                        <tr
                          key={n.id}
                          className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                        >
                          {/* ID */}
                          <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                            #{n.id}
                          </td>

                          {/* Channel */}
                          <td className="px-4 py-3">
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md capitalize">
                              {n.channel}
                            </span>
                          </td>

                          {/* Recipient */}
                          <td className="px-4 py-3 text-slate-300 text-xs truncate max-w-[140px]">
                            {n.recipient}
                          </td>

                          {/* Message truncated */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setPreviewItem(n)}
                              className="text-slate-400 text-xs truncate max-w-[180px] block hover:text-blue-400 text-left transition-colors"
                              title="Clique para ver a mensagem completa"
                            >
                              {n.message_body
                                ? n.message_body.length > 60
                                  ? n.message_body.slice(0, 60) + "…"
                                  : n.message_body
                                : "—"}
                            </button>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={n.status} />
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                            {n.sent_at
                              ? format(new Date(n.sent_at), "dd/MM/yy HH:mm", {
                                  locale: ptBR,
                                })
                              : n.created_at
                              ? format(new Date(n.created_at), "dd/MM/yy HH:mm", {
                                  locale: ptBR,
                                })
                              : "—"}
                          </td>

                          {/* Errors */}
                          <td className="px-4 py-3 text-center">
                            {n.error_message ? (
                              <button
                                onClick={() => setPreviewItem(n)}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors truncate max-w-[100px] block mx-auto"
                                title={n.error_message}
                              >
                                {n.error_message.length > 20
                                  ? n.error_message.slice(0, 20) + "…"
                                  : n.error_message}
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Retry count */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={clsx(
                                "text-xs font-medium",
                                n.retry_count > 0
                                  ? "text-yellow-400"
                                  : "text-slate-600"
                              )}
                            >
                              {n.retry_count}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            {n.status === "falhou" ? (
                              <button
                                onClick={() => retryMutation.mutate(n.id)}
                                disabled={retryingId === n.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                              >
                                <Send
                                  size={10}
                                  className={retryingId === n.id ? "animate-pulse" : ""}
                                />
                                {retryingId === n.id ? "Reenviando..." : "Reenviar"}
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Expand toggle */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                setExpandedId(expandedId === n.id ? null : n.id)
                              }
                              className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              {expandedId === n.id ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded full message row */}
                        {expandedId === n.id && (
                          <tr key={`${n.id}-detail`} className="bg-slate-900/60">
                            <td colSpan={10} className="px-6 py-4">
                              <div className="space-y-2">
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                                  Mensagem completa
                                </p>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                  {n.message_body || "Sem conteúdo"}
                                </p>
                                {n.error_message && (
                                  <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">
                                      Erro
                                    </p>
                                    <p className="text-xs text-red-300 leading-relaxed">
                                      {n.error_message}
                                    </p>
                                  </div>
                                )}
                                {n.external_id && (
                                  <p className="text-xs text-slate-600">
                                    ID Externo: {n.external_id}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Auto-refresh note ── */}
          <p className="text-xs text-slate-600 text-center pb-2">
            Atualização automática a cada 30 segundos
          </p>
        </main>
      </div>

      {/* ── Message preview modal ── */}
      {previewItem && (
        <MessageModal notification={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}
