"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";

interface Notification {
  id: number;
  email_id: number | null;
  channel: string;
  recipient: string;
  message_body: string;
  status: string;
  sent_at: string | null;
  error_message: string;
  retry_count: number;
  external_id: string;
  created_at: string | null;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "enviado") return <CheckCircle size={16} className="text-green-400 shrink-0" />;
  if (status === "falhou") return <XCircle size={16} className="text-red-400 shrink-0" />;
  return <Clock size={16} className="text-yellow-400 shrink-0" />;
};

const statusBg: Record<string, string> = {
  enviado: "bg-green-500/20 text-green-400",
  falhou: "bg-red-500/20 text-red-400",
  pendente: "bg-yellow-500/20 text-yellow-400",
  reenvio: "bg-blue-500/20 text-blue-400",
};

export default function NotificationsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [manualMsg, setManualMsg] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications-page"],
    queryFn: () => api.get<Notification[]>("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-page"] }),
  });

  const sendManual = useMutation({
    mutationFn: () =>
      api
        .post("/notifications/manual", { email_id: 0, message: manualMsg })
        .then((r) => r.data),
    onSuccess: () => {
      setManualMsg("");
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
    },
  });

  const notifications: Notification[] = data ?? [];
  const sentCount = notifications.filter((n) => n.status === "enviado").length;
  const failedCount = notifications.filter((n) => n.status === "falhou").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: notifications.length, color: "text-blue-400" },
              { label: "Enviadas", value: sentCount, color: "text-green-400" },
              { label: "Falhas", value: failedCount, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center"
              >
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Manual send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Enviar Notificação Manual</h3>
            <div className="flex gap-3">
              <textarea
                rows={3}
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Digite a mensagem para enviar via WhatsApp..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                onClick={() => sendManual.mutate()}
                disabled={!manualMsg.trim() || sendManual.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors self-end"
              >
                <Send size={14} />
                {sendManual.isPending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw size={12} />
                Atualizar
              </button>
            </div>

            {isLoading && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            )}

            <div className="divide-y divide-slate-700/50">
              {notifications.map((n) => (
                <div key={n.id} className="px-5 py-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                  >
                    <StatusIcon status={n.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{n.message_body}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBg[n.status] ?? "bg-slate-700 text-slate-300"}`}
                        >
                          {n.status}
                        </span>
                        <span className="text-xs text-slate-500">{n.channel}</span>
                        {n.sent_at && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(n.sent_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                          </span>
                        )}
                        {n.retry_count > 0 && (
                          <span className="text-xs text-slate-500">
                            {n.retry_count} tentativa(s)
                          </span>
                        )}
                      </div>
                      {n.error_message && (
                        <p className="text-xs text-red-400 mt-1">{n.error_message}</p>
                      )}
                    </div>
                    {n.status === "falhou" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retryMutation.mutate(n.id);
                        }}
                        disabled={retryMutation.isPending}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 bg-orange-600/20 border border-orange-600/40 text-orange-400 rounded text-xs hover:bg-orange-600/30 transition-colors"
                      >
                        <RefreshCw size={10} />
                        Reenviar
                      </button>
                    )}
                  </div>

                  {expanded === n.id && (
                    <div className="mt-3 pl-7 text-xs text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Destinatário:</span> {n.recipient}
                      </div>
                      {n.external_id && (
                        <div>
                          <span className="text-slate-500">ID externo:</span> {n.external_id}
                        </div>
                      )}
                      {n.created_at && (
                        <div>
                          <span className="text-slate-500">Criado em:</span>{" "}
                          {format(new Date(n.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {!isLoading && notifications.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhuma notificação encontrada
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
