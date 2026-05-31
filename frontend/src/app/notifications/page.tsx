"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Clock, RefreshCw, MessageCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const StatusBadge = ({ status }: { status: string }) => {
  const map = {
    enviado: { bg: "bg-green-500/20 text-green-400 border-green-500/30", Icon: CheckCircle },
    falhou: { bg: "bg-red-500/20 text-red-400 border-red-500/30", Icon: XCircle },
    reenvio: { bg: "bg-blue-500/20 text-blue-400 border-blue-500/30", Icon: RefreshCw },
    pendente: { bg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", Icon: Clock },
  } as Record<string, { bg: string; Icon: React.ElementType }>;
  const { bg, Icon } = map[status] ?? map.pendente;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border", bg)}>
      <Icon size={10} />
      {status}
    </span>
  );
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(200),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const retry = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const filtered = statusFilter
    ? notifications.filter((n) => n.status === statusFilter)
    : notifications;

  const counts = notifications.reduce(
    (acc, n) => { acc[n.status] = (acc[n.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total", value: notifications.length, color: "text-slate-300" },
              { label: "Enviadas", value: counts.enviado ?? 0, color: "text-green-400" },
              { label: "Falhas", value: counts.falhou ?? 0, color: "text-red-400" },
              { label: "Reenvios", value: counts.reenvio ?? 0, color: "text-blue-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={clsx("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filter + Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-white">
                  {isLoading ? "Carregando..." : `${filtered.length} notificações`}
                </h3>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="">Todos os status</option>
                <option value="enviado">Enviados</option>
                <option value="falhou">Falhas</option>
                <option value="reenvio">Reenvio</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>

            <div className="divide-y divide-slate-700/50">
              {filtered.length === 0 && !isLoading && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  Nenhuma notificação encontrada
                </div>
              )}
              {filtered.map((n: NotificationItem) => (
                <>
                  <div
                    key={n.id}
                    className="px-5 py-3 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={n.status} />
                        <span className="text-xs text-slate-300 truncate max-w-xs">{n.message_body}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {n.sent_at && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(n.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {n.retry_count > 0 && (
                          <span className="text-xs text-yellow-500">{n.retry_count}x</span>
                        )}
                        {n.status === "falhou" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); retry.mutate(n.id); }}
                            disabled={retry.isPending}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 text-xs rounded transition-colors disabled:opacity-40"
                          >
                            <RefreshCw size={10} className={retry.isPending ? "animate-spin" : ""} />
                            Reenviar
                          </button>
                        )}
                        {expanded === n.id ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                      </div>
                    </div>
                  </div>
                  {expanded === n.id && (
                    <div key={`${n.id}-detail`} className="px-6 py-4 bg-slate-900/50 space-y-2">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <span className="text-slate-500">Canal</span><span className="text-slate-300">{n.channel}</span>
                        <span className="text-slate-500">Destinatário</span><span className="text-slate-300">{n.recipient}</span>
                        {n.external_id && <><span className="text-slate-500">ID externo</span><span className="text-slate-300 font-mono">{n.external_id}</span></>}
                        {n.created_at && <><span className="text-slate-500">Criado em</span><span className="text-slate-300">{format(new Date(n.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span></>}
                        {n.email_id && <><span className="text-slate-500">E-mail ID</span><span className="text-slate-300">#{n.email_id}</span></>}
                      </div>
                      {n.error_message && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                          {n.error_message}
                        </div>
                      )}
                      <div className="mt-2 p-3 bg-slate-800 rounded text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {n.message_body}
                      </div>
                    </div>
                  )}
                </>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
