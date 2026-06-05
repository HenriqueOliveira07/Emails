"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, sendManualNotification, NotificationItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={16} className="text-green-400" />;
  if (status === "falhou") return <XCircle size={16} className="text-red-400" />;
  return <Clock size={16} className="text-yellow-400" />;
};

const statusBadge = (status: string) => {
  if (status === "enviado") return "bg-green-500/20 text-green-400";
  if (status === "falhou") return "bg-red-500/20 text-red-400";
  return "bg-yellow-500/20 text-yellow-400";
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [manualMessage, setManualMessage] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(100),
    refetchInterval: 15_000,
  });

  const retry = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
      showToast("Notificação reenviada!");
    },
    onError: () => showToast("Falha ao reenviar"),
  });

  const manual = useMutation({
    mutationFn: () => sendManualNotification(0, manualMessage),
    onSuccess: () => {
      setManualMessage("");
      setShowManual(false);
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
      showToast("Mensagem enviada via WhatsApp!");
    },
    onError: () => showToast("Falha ao enviar mensagem"),
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;
  const pending = notifications.filter((n) => n.status === "pendente").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Toast */}
          {toastMsg && (
            <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
              {toastMsg}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Enviadas", value: sent, color: "green", icon: CheckCircle },
              { label: "Falhas", value: failed, color: "red", icon: XCircle },
              { label: "Pendentes", value: pending, color: "yellow", icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-lg bg-${color}-500/20`}>
                  <Icon size={20} className={`text-${color}-400`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-sm text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Manual Send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageCircle size={16} className="text-green-400" />
                Envio Manual
              </h3>
              <button
                onClick={() => setShowManual(!showManual)}
                className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                {showManual ? "Cancelar" : "Nova Mensagem"}
              </button>
            </div>
            {showManual && (
              <div className="space-y-2">
                <textarea
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  placeholder="Digite a mensagem para enviar via WhatsApp..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-green-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <span className="text-xs text-slate-500 self-center">{manualMessage.length} chars</span>
                  <button
                    onClick={() => manual.mutate()}
                    disabled={!manualMessage.trim() || manual.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                  >
                    <Send size={14} />
                    {manual.isPending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notification List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Histórico ({notifications.length})</h3>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Nenhuma notificação registrada</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.map((n: NotificationItem) => (
                  <div key={n.id} className="px-5 py-4 flex items-start gap-3 hover:bg-slate-700/20 transition-colors">
                    <StatusIcon status={n.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx("text-xs px-2 py-0.5 rounded font-medium", statusBadge(n.status))}>
                          {n.status}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{n.channel}</span>
                        {n.retry_count > 0 && (
                          <span className="text-xs text-yellow-500">retry: {n.retry_count}x</span>
                        )}
                        {n.sent_at && (
                          <span className="text-xs text-slate-500 ml-auto">
                            {format(new Date(n.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">{n.message_body}</p>
                      {n.error_message && (
                        <p className="text-xs text-red-400 mt-1">Erro: {n.error_message}</p>
                      )}
                      {n.external_id && (
                        <p className="text-xs text-slate-500 mt-1">ID: {n.external_id}</p>
                      )}
                    </div>
                    {n.status === "falhou" && (
                      <button
                        onClick={() => retry.mutate(n.id)}
                        disabled={retry.isPending}
                        title="Reenviar"
                        className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-green-400 transition-colors shrink-0"
                      >
                        <RefreshCw size={14} />
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
