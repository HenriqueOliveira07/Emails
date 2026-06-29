"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, triggerSummary, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RotateCcw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [sendingSummary, setSendingSummary] = useState(false);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 15_000,
  });

  const retry = useMutation({
    mutationFn: (id: number) => retryNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const handleSummary = async () => {
    setSendingSummary(true);
    try {
      await triggerSummary();
    } finally {
      setSendingSummary(false);
    }
  };

  const items = notifications ?? [];
  const sentCount = items.filter((n) => n.status === "enviado").length;
  const failedCount = items.filter((n) => n.status === "falhou").length;
  const pendingCount = items.filter((n) => n.status === "pendente" || n.status === "reenvio").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificacoes" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="text-green-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{sentCount}</p>
                <p className="text-xs text-slate-400">Enviadas</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle className="text-red-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{failedCount}</p>
                <p className="text-xs text-slate-400">Falharam</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Clock className="text-yellow-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{pendingCount}</p>
                <p className="text-xs text-slate-400">Pendentes</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSummary}
              disabled={sendingSummary}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white"
            >
              <Send size={14} />
              {sendingSummary ? "Enviando..." : "Enviar Resumo Diario"}
            </button>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Historico de Notificacoes WhatsApp</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Destinatario</th>
                    <th className="px-4 py-3 text-left">Mensagem</th>
                    <th className="px-4 py-3 text-left">Enviada em</th>
                    <th className="px-4 py-3 text-center">Tentativas</th>
                    <th className="px-4 py-3 text-left">Erro</th>
                    <th className="px-4 py-3 text-center">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Carregando...</td></tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhuma notificacao encontrada</td></tr>
                  )}
                  {items.map((n) => (
                    <tr key={n.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md w-fit ${
                          n.status === "enviado" ? "bg-green-500/20 text-green-400" :
                          n.status === "falhou" ? "bg-red-500/20 text-red-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {n.status === "enviado" ? <CheckCircle size={10} /> :
                           n.status === "falhou" ? <XCircle size={10} /> :
                           <Clock size={10} />}
                          {n.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{n.recipient}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-300 truncate max-w-[280px]">{n.message_body}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {n.sent_at ? format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) :
                         n.created_at ? format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "--"}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">{n.retry_count}</td>
                      <td className="px-4 py-3">
                        {n.error_message && <p className="text-xs text-red-400 truncate max-w-[200px]">{n.error_message}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {n.status === "falhou" && (
                          <button
                            onClick={() => retry.mutate(n.id)}
                            disabled={retry.isPending}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg"
                            title="Reenviar"
                          >
                            <RotateCcw size={12} className={`text-slate-300 ${retry.isPending ? "animate-spin" : ""}`} />
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
