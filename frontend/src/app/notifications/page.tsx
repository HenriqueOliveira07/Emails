"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, sendManualNotification } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400 shrink-0" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400 shrink-0" />;
  return <Clock size={14} className="text-yellow-400 shrink-0" />;
};

const statusBadge = (status: string) => {
  if (status === "enviado") return "bg-green-500/20 text-green-400";
  if (status === "falhou") return "bg-red-500/20 text-red-400";
  return "bg-yellow-500/20 text-yellow-400";
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications({ limit: 200 }),
    refetchInterval: 30_000,
  });

  const retry = useMutation({
    mutationFn: (id: number) => retryNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
      showToast("Notificação reenviada com sucesso");
    },
    onError: () => showToast("Erro ao reenviar notificação"),
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSendManual() {
    if (!manualMsg.trim()) return;
    setSending(true);
    try {
      await sendManualNotification(0, manualMsg);
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
      showToast("Mensagem enviada com sucesso!");
    } catch {
      showToast("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  const items = notifications ?? [];
  const sent = items.filter((n) => n.status === "enviado").length;
  const failed = items.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Toast */}
          {toast && (
            <div className="fixed top-4 right-4 z-50 bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-sm shadow-lg">
              {toast}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <MessageCircle size={20} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{items.length}</p>
                <p className="text-xs text-slate-400">Total enviadas</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{sent}</p>
                <p className="text-xs text-slate-400">Com sucesso</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{failed}</p>
                <p className="text-xs text-slate-400">Com falha</p>
              </div>
            </div>
          </div>

          {/* Envio manual */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Send size={14} className="text-blue-400" />
              Enviar Mensagem Manual
            </h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem para enviar via WhatsApp..."
                rows={3}
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleSendManual}
                disabled={sending || !manualMsg.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors flex items-center gap-2 self-end"
              >
                <Send size={14} />
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
            ) : (
              <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
                {items.length === 0 && (
                  <div className="px-5 py-8 text-center text-slate-400 text-sm">
                    Nenhuma notificação registrada
                  </div>
                )}
                {items.map((n) => (
                  <div key={n.id} className="px-5 py-4 flex items-start gap-3">
                    <StatusIcon status={n.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 leading-relaxed line-clamp-3">
                        {n.message_body}
                      </p>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(n.status)}`}>
                          {n.status}
                        </span>
                        <span className="text-xs text-slate-500">{n.channel}</span>
                        {n.sent_at && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </span>
                        )}
                        {n.retry_count > 0 && (
                          <span className="text-xs text-orange-400">{n.retry_count} tentativa(s)</span>
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
                        className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50 shrink-0"
                      >
                        <RefreshCw size={13} className={retry.isPending ? "animate-spin" : ""} />
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
