"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    enviado: "bg-green-500/20 text-green-400",
    falhou: "bg-red-500/20 text-red-400",
    pendente: "bg-yellow-500/20 text-yellow-400",
    reenvio: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", map[status] ?? "bg-slate-500/20 text-slate-400")}>
      {status}
    </span>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400 shrink-0" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400 shrink-0" />;
  return <Clock size={14} className="text-yellow-400 shrink-0" />;
};

export default function NotificationsPage() {
  const [retrying, setRetrying] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  const { data: notifications, isLoading, refetch } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-full"],
    queryFn: () => api.get("/notifications?limit=200").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const filtered = (notifications ?? []).filter(
    (n) => !filterStatus || n.status === filterStatus
  );

  async function handleRetry(id: number) {
    setRetrying(id);
    try {
      await api.post(`/notifications/${id}/retry`);
      await refetch();
    } finally {
      setRetrying(null);
    }
  }

  const stats = {
    total: (notifications ?? []).length,
    sent: (notifications ?? []).filter((n) => n.status === "enviado").length,
    failed: (notifications ?? []).filter((n) => n.status === "falhou").length,
    pending: (notifications ?? []).filter((n) => n.status === "pendente").length,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Stats mini */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total", value: stats.total, color: "text-white" },
              { label: "Enviadas", value: stats.sent, color: "text-green-400" },
              { label: "Falharam", value: stats.failed, color: "text-red-400" },
              { label: "Pendentes", value: stats.pending, color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={clsx("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtros + tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações WhatsApp</h3>
              <div className="flex items-center gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="">Todos status</option>
                  <option value="enviado">Enviados</option>
                  <option value="falhou">Falharam</option>
                  <option value="pendente">Pendentes</option>
                </select>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-8"></th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Canal</th>
                    <th className="px-4 py-3 text-left">Enviado em</th>
                    <th className="px-4 py-3 text-left">Tentativas</th>
                    <th className="px-4 py-3 text-left">Erro</th>
                    <th className="px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Nenhuma notificação encontrada
                      </td>
                    </tr>
                  )}
                  {filtered.map((n) => (
                    <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <StatusIcon status={n.status} />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-slate-300 truncate">{n.message_body}</p>
                        <p className="text-xs text-slate-500 mt-0.5">ID #{n.id}{n.email_id ? ` · E-mail #${n.email_id}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-slate-300">
                          <Send size={11} />
                          {n.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {n.sent_at
                          ? format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : n.created_at
                          ? format(new Date(n.created_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx("text-xs", n.retry_count > 0 ? "text-yellow-400" : "text-slate-500")}>
                          {n.retry_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {n.error_message ? (
                          <span className="text-xs text-red-400 truncate block" title={n.error_message}>
                            {n.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.status === "falhou" && (
                          <button
                            onClick={() => handleRetry(n.id)}
                            disabled={retrying === n.id}
                            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                          >
                            {retrying === n.id ? "..." : "Reenviar"}
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
