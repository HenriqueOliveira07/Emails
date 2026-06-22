"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, triggerSummary, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Clock, RefreshCw, Send, MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-yellow-400" />;
};

const statusColors: Record<string, string> = {
  enviado: "bg-green-500/20 text-green-400 border-green-500/30",
  falhou: "bg-red-500/20 text-red-400 border-red-500/30",
  pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  reenvio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 30_000,
  });

  const retry = useMutation({
    mutationFn: retryNotification,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
      showToast(data.success ? "Reenvio bem-sucedido!" : "Falha no reenvio.");
    },
  });

  const summary = useMutation({
    mutationFn: triggerSummary,
    onSuccess: () => showToast("Resumo diário enviado!"),
  });

  const filtered = (notifications ?? []).filter(
    (n) => !statusFilter || n.status === statusFilter
  );

  const stats = {
    total: notifications?.length ?? 0,
    sent: notifications?.filter((n) => n.status === "enviado").length ?? 0,
    failed: notifications?.filter((n) => n.status === "falhou").length ?? 0,
    pending: notifications?.filter((n) => n.status === "pendente").length ?? 0,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {toast && (
            <div className="fixed top-4 right-4 bg-slate-700 border border-slate-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
              {toast}
            </div>
          )}

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total", value: stats.total, color: "text-white" },
              { label: "Enviadas", value: stats.sent, color: "text-green-400" },
              { label: "Falharam", value: stats.failed, color: "text-red-400" },
              { label: "Pendentes", value: stats.pending, color: "text-yellow-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <MessageCircle size={18} className="text-slate-500" />
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="enviado">Enviado</option>
              <option value="falhou">Falhou</option>
              <option value="pendente">Pendente</option>
              <option value="reenvio">Reenvio</option>
            </select>
            <button
              onClick={() => summary.mutate()}
              disabled={summary.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
            >
              <Send size={14} />
              {summary.isPending ? "Enviando..." : "Resumo Diário"}
            </button>
          </div>

          {/* Lista */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando...</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-slate-400">Nenhuma notificação encontrada</div>
                )}
                {filtered.map((n: NotificationItem) => (
                  <div key={n.id} className="px-5 py-4 flex items-start gap-3">
                    <StatusIcon status={n.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-2">{n.message_body}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[n.status] || statusColors.pendente}`}>
                          {n.status}
                        </span>
                        <span className="text-xs text-slate-500">{n.channel}</span>
                        <span className="text-xs text-slate-500">{n.recipient}</span>
                        {n.sent_at && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {n.retry_count > 0 && (
                          <span className="text-xs text-orange-400">
                            {n.retry_count} tentativa(s)
                          </span>
                        )}
                        {n.error_message && (
                          <span className="text-xs text-red-400 truncate max-w-[200px]">
                            {n.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                    {n.status === "falhou" && (
                      <button
                        onClick={() => retry.mutate(n.id)}
                        disabled={retry.isPending}
                        title="Reenviar"
                        className="text-slate-400 hover:text-blue-400 transition-colors shrink-0 mt-1"
                      >
                        <RefreshCw size={14} className={retry.isPending ? "animate-spin" : ""} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
