"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, retryNotification, sendManualNotification, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send, MessageCircle } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_FILTERS = ["Todos", "enviado", "falhou", "pendente"];

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    enviado: { icon: <CheckCircle size={12} />, cls: "bg-green-500/20 text-green-400" },
    falhou: { icon: <XCircle size={12} />, cls: "bg-red-500/20 text-red-400" },
    pendente: { icon: <Clock size={12} />, cls: "bg-yellow-500/20 text-yellow-400" },
    reenvio: { icon: <RefreshCw size={12} />, cls: "bg-blue-500/20 text-blue-400" },
  };
  const s = map[status] ?? map["pendente"];
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", s.cls)}>
      {s.icon} {status}
    </span>
  );
};

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [manualMsg, setManualMsg] = useState("");
  const [showManual, setShowManual] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-full"],
    queryFn: () => fetchNotifications(200),
    refetchInterval: 15_000,
  });

  const retryMutation = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-full"] }),
  });

  const manualMutation = useMutation({
    mutationFn: (msg: string) => sendManualNotification(0, msg),
    onSuccess: () => {
      setManualMsg("");
      setShowManual(false);
      queryClient.invalidateQueries({ queryKey: ["notifications-full"] });
    },
  });

  const filtered = statusFilter === "Todos"
    ? notifications
    : notifications.filter((n) => n.status === statusFilter);

  const sentCount = notifications.filter((n) => n.status === "enviado").length;
  const failedCount = notifications.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: notifications.length, cls: "text-white" },
              { label: "Enviadas", value: sentCount, cls: "text-green-400" },
              { label: "Falhas", value: failedCount, cls: "text-red-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={clsx("text-2xl font-bold", cls)}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtros + Ação manual */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                    statusFilter === s ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowManual(!showManual)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs text-white transition-colors"
            >
              <MessageCircle size={12} /> Notificação Manual
            </button>
          </div>

          {/* Envio manual */}
          {showManual && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-white">Enviar Notificação Manual via WhatsApp</p>
              <textarea
                rows={4}
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem a ser enviada..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => manualMsg.trim() && manualMutation.mutate(manualMsg.trim())}
                  disabled={!manualMsg.trim() || manualMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                >
                  <Send size={12} />
                  {manualMutation.isPending ? "Enviando..." : "Enviar"}
                </button>
                <button
                  onClick={() => setShowManual(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de notificações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico</h3>
              <span className="text-xs text-slate-400">{filtered.length} registros</span>
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
                <div key={n.id} className="px-5 py-4 flex items-start gap-4">
                  <StatusBadge status={n.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 whitespace-pre-wrap break-words leading-relaxed max-h-24 overflow-hidden">
                      {n.message_body}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>Para: {n.recipient}</span>
                      {n.sent_at && (
                        <span>{format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      )}
                      {n.retry_count > 0 && <span>{n.retry_count}x tentativa(s)</span>}
                      {n.external_id && <span className="truncate max-w-[120px]">{n.external_id}</span>}
                    </div>
                    {n.error_message && (
                      <p className="mt-1 text-xs text-red-400 truncate">{n.error_message}</p>
                    )}
                  </div>
                  {n.status === "falhou" && (
                    <button
                      onClick={() => retryMutation.mutate(n.id)}
                      disabled={retryMutation.isPending}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-xs transition-colors"
                    >
                      <RefreshCw size={11} className={retryMutation.isPending ? "animate-spin" : ""} />
                      Reenviar
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
