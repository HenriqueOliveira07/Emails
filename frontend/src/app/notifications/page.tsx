"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, retryNotification, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const STATUS_FILTERS = ["", "enviado", "falhou", "pendente"] as const;
const STATUS_LABEL: Record<string, string> = {
  enviado: "Enviado", falhou: "Falhou", pendente: "Pendente", reenvio: "Reenvio",
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: typeof CheckCircle; color: string }> = {
    enviado: { icon: CheckCircle, color: "text-green-400" },
    falhou: { icon: XCircle, color: "text-red-400" },
    pendente: { icon: Clock, color: "text-yellow-400" },
    reenvio: { icon: RefreshCw, color: "text-blue-400" },
  };
  const { icon: Icon, color } = cfg[status] ?? { icon: Clock, color: "text-slate-400" };
  return <Icon size={14} className={color} />;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");

  const { data = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications", "all"],
    queryFn: () => fetchNotifications(200),
    refetchInterval: 30_000,
  });

  const retry = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filtered = statusFilter
    ? data.filter((n) => n.status === statusFilter)
    : data;

  const sentCount = data.filter((n) => n.status === "enviado").length;
  const failedCount = data.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: data.length, color: "text-white" },
              { label: "Enviadas", value: sentCount, color: "text-green-400" },
              { label: "Falhas", value: failedCount, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <MessageCircle size={18} className={clsx("mx-auto mb-2", color)} />
                <p className={clsx("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s || "all"}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs transition-colors",
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {s ? STATUS_LABEL[s] : "Todos"}
              </button>
            ))}
          </div>

          {/* Notifications list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
              <span className="text-xs text-slate-400">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-slate-700/50">
              {isLoading && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhuma notificação encontrada
                </div>
              )}
              {filtered.map((n) => (
                <div key={n.id} className="px-5 py-4 flex items-start gap-3 hover:bg-slate-700/20 transition-colors">
                  <StatusBadge status={n.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 font-medium line-clamp-2">{n.message_body}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={clsx(
                        "text-xs px-1.5 py-0.5 rounded",
                        n.status === "enviado" ? "bg-green-500/20 text-green-400"
                          : n.status === "falhou" ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {STATUS_LABEL[n.status] ?? n.status}
                      </span>
                      <span className="text-xs text-slate-500">{n.channel}</span>
                      {n.sent_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {n.retry_count > 0 && (
                        <span className="text-xs text-orange-400">{n.retry_count} tentativa{n.retry_count !== 1 ? "s" : ""}</span>
                      )}
                      {n.error_message && (
                        <span className="text-xs text-red-400 truncate max-w-[200px]">{n.error_message}</span>
                      )}
                    </div>
                  </div>
                  {n.status === "falhou" && (
                    <button
                      onClick={() => retry.mutate(n.id)}
                      disabled={retry.isPending}
                      title="Reenviar"
                      className="shrink-0 p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                    >
                      <RefreshCw size={13} className={retry.isPending ? "animate-spin" : ""} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
