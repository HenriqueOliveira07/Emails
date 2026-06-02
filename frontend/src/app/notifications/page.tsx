"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Clock, RefreshCw, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface NotificationFull {
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

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = {
    enviado: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
    falhou: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
    pendente: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    reenvio: { icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-500/10" },
  }[status] ?? { icon: Clock, color: "text-slate-400", bg: "bg-slate-500/10" };

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon size={11} />
      {status}
    </span>
  );
};

export default function NotificationsPage() {
  const [manualMsg, setManualMsg] = useState("");
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const { data: notifications, isLoading, refetch } = useQuery<NotificationFull[]>({
    queryKey: ["notifications-full"],
    queryFn: () => api.get("/notifications?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/retry`).then((r) => r.data),
    onSuccess: () => refetch(),
  });

  async function sendManual() {
    if (!manualMsg.trim()) return;
    setSendStatus("Enviando...");
    try {
      await api.post("/notifications/manual", { email_id: 0, message: manualMsg });
      setSendStatus("Enviado com sucesso!");
      setManualMsg("");
      refetch();
    } catch {
      setSendStatus("Erro ao enviar");
    }
    setTimeout(() => setSendStatus(null), 3000);
  }

  const sent = notifications?.filter((n) => n.status === "enviado").length ?? 0;
  const failed = notifications?.filter((n) => n.status === "falhou").length ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações WhatsApp" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total", value: notifications?.length ?? "—", color: "text-white" },
              { label: "Enviadas", value: sent, color: "text-green-400" },
              { label: "Falhas", value: failed, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Manual send */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Send size={14} className="text-blue-400" />
              Enviar Mensagem Manual
            </h3>
            <div className="flex gap-3">
              <textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                rows={3}
                placeholder="Digite a mensagem a ser enviada via WhatsApp..."
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <button
                onClick={sendManual}
                disabled={!manualMsg.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors self-start"
              >
                Enviar
              </button>
            </div>
            {sendStatus && (
              <p className={`mt-2 text-xs ${sendStatus.includes("sucesso") ? "text-green-400" : sendStatus.includes("Erro") ? "text-red-400" : "text-slate-400"}`}>
                {sendStatus}
              </p>
            )}
          </div>

          {/* List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Histórico de Notificações</h3>
              <button onClick={() => refetch()} className="text-xs text-slate-400 hover:text-white transition-colors">
                Atualizar
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
            ) : notifications?.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Nenhuma notificação registrada</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications?.map((n) => (
                  <div key={n.id} className="px-5 py-4 flex gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={n.status} />
                        <span className="text-xs text-slate-500">#{n.id}</span>
                        {n.sent_at && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(n.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {n.message_body}
                      </p>
                      {n.error_message && (
                        <p className="text-xs text-red-400 mt-1">{n.error_message}</p>
                      )}
                      {n.retry_count > 0 && (
                        <p className="text-xs text-slate-500 mt-1">Tentativas: {n.retry_count}</p>
                      )}
                    </div>
                    {n.status === "falhou" && (
                      <button
                        onClick={() => retryMutation.mutate(n.id)}
                        disabled={retryMutation.isPending}
                        className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                      >
                        <RefreshCw size={11} className="inline mr-1" />
                        Reenviar
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
