"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllNotifications,
  retryNotification,
  sendManualNotification,
  NotificationItem,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  MessageCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  enviado: "Enviado",
  falhou: "Falhou",
  pendente: "Pendente",
  reenvio: "Reenvio",
};

function StatusBadge({ status }: { status: string }) {
  const classes = {
    enviado: "bg-green-500/20 text-green-400 border-green-500/30",
    falhou: "bg-red-500/20 text-red-400 border-red-500/30",
    pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    reenvio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded-md text-xs font-medium border",
        classes[status as keyof typeof classes] ?? classes.pendente
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "enviado") return <CheckCircle size={14} className="text-green-400 shrink-0" />;
  if (status === "falhou") return <XCircle size={14} className="text-red-400 shrink-0" />;
  return <Clock size={14} className="text-yellow-400 shrink-0" />;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [manualMsg, setManualMsg] = useState("");
  const [formError, setFormError] = useState("");

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(200),
    refetchInterval: 30_000,
  });

  const retryMut = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const manualMut = useMutation({
    mutationFn: ({ message }: { message: string }) => sendManualNotification(0, message),
    onSuccess: () => {
      setManualMsg("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
    },
    onError: () => setFormError("Falha ao enviar notificação"),
  });

  const filtered = statusFilter
    ? notifications.filter((n) => n.status === statusFilter)
    : notifications;

  const sent = notifications.filter((n) => n.status === "enviado").length;
  const failed = notifications.filter((n) => n.status === "falhou").length;
  const pending = notifications.filter((n) => n.status === "pendente").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 overflow-y-auto space-y-6">

          {/* Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total", value: notifications.length, color: "text-white" },
              { label: "Enviados", value: sent, color: "text-green-400" },
              { label: "Falhas", value: failed, color: "text-red-400" },
              { label: "Pendentes", value: pending, color: "text-yellow-400" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-1"
              >
                <p className={clsx("text-2xl font-bold", color)}>{value}</p>
                <p className="text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtros + Ação */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
              {[null, "enviado", "falhou", "pendente"].map((s) => (
                <button
                  key={s ?? "todos"}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    statusFilter === s
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {s ? STATUS_LABELS[s] : "Todos"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowForm((v) => !v)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
            >
              <Send size={12} />
              Enviar Manual
            </button>
          </div>

          {/* Formulário manual */}
          {showForm && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageCircle size={14} className="text-green-400" />
                Enviar notificação manual
              </h3>
              <textarea
                value={manualMsg}
                onChange={(e) => { setManualMsg(e.target.value); setFormError(""); }}
                placeholder="Digite a mensagem a enviar via WhatsApp..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!manualMsg.trim()) { setFormError("Mensagem obrigatória"); return; }
                    manualMut.mutate({ message: manualMsg });
                  }}
                  disabled={manualMut.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                >
                  <Send size={12} />
                  {manualMut.isPending ? "Enviando..." : "Enviar"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setManualMsg(""); setFormError(""); }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Histórico de Notificações
              </h3>
              <span className="text-xs text-slate-500">{filtered.length} registros</span>
            </div>

            {isLoading && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                Carregando...
              </div>
            )}

            <div className="divide-y divide-slate-700/50">
              {!isLoading && filtered.length === 0 && (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Nenhuma notificação encontrada
                </div>
              )}
              {filtered.map((n) => (
                <div key={n.id} className="px-5 py-4 flex items-start gap-3 hover:bg-slate-700/20 transition-colors">
                  <StatusIcon status={n.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug line-clamp-2">
                      {n.message_body}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <StatusBadge status={n.status} />
                      {n.sent_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(n.sent_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {!n.sent_at && n.created_at && (
                        <span className="text-xs text-slate-500">
                          Criado: {format(new Date(n.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {n.retry_count > 0 && (
                        <span className="text-xs text-slate-500">
                          Tentativas: {n.retry_count}
                        </span>
                      )}
                      {n.error_message && (
                        <span className="text-xs text-red-400 truncate max-w-[300px]">
                          {n.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                  {n.status === "falhou" && (
                    <button
                      onClick={() => retryMut.mutate(n.id)}
                      disabled={retryMut.isPending && retryMut.variables === n.id}
                      title="Reenviar notificação"
                      className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-blue-600/30 border border-slate-600 hover:border-blue-500 rounded-md text-xs text-slate-300 hover:text-blue-300 transition-colors shrink-0"
                    >
                      <RefreshCw size={10} />
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
