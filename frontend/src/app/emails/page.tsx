"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem, triggerCheck, api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, MessageCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICO: "bg-red-500/20 text-red-400 border border-red-500/30",
  ALTO: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  MEDIO: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  BAIXO: "bg-green-500/20 text-green-400 border border-green-500/30",
};

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reclassifying, setReclassifying] = useState<number | null>(null);
  const [limit, setLimit] = useState(50);

  const params: Record<string, string | number | boolean> = { limit, offset: 0 };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments === "sim") params.has_attachments = true;
  if (hasAttachments === "nao") params.has_attachments = false;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments, limit],
    queryFn: () => fetchEmails(params),
    refetchInterval: 60_000,
  });

  const emails: EmailItem[] = data?.items ?? [];

  async function reclassify(id: number) {
    setReclassifying(id);
    try {
      await api.post(`/emails/${id}/reclassify`);
      await refetch();
    } finally {
      setReclassifying(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas as prioridades</option>
                <option value="CRITICO">Crítico</option>
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Médio</option>
                <option value="BAIXO">Baixo</option>
              </select>

              <select
                value={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos (com/sem anexos)</option>
                <option value="sim">Com anexos</option>
                <option value="nao">Sem anexos</option>
              </select>

              <input
                type="text"
                placeholder="Filtrar por remetente..."
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 min-w-[200px]"
              />

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value={25}>25 registros</option>
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
                <option value={200}>200 registros</option>
              </select>

              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
              >
                <RefreshCw size={12} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${emails.length} e-mail(s) encontrado(s)`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto / Categoria</th>
                    <th className="px-4 py-3 text-left">Recebido</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center">Ação</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Carregando e-mails...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Nenhum e-mail encontrado com os filtros selecionados
                      </td>
                    </tr>
                  )}
                  {emails.map((email) => (
                    <>
                      <tr
                        key={email.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                      >
                        <td className="px-4 py-3">
                          <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", PRIORITY_COLORS[email.priority])}>
                            {PRIORITY_LABEL[email.priority] || email.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-[160px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[160px]">{email.sender_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[240px] flex items-center gap-1">
                            {email.action_required && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                            {email.subject}
                          </div>
                          <div className="text-slate-500 text-xs">{email.category}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.has_attachments ? (
                            <span className="flex items-center justify-center gap-1 text-blue-400">
                              <Paperclip size={12} />
                              <span className="text-xs">{email.attachment_count}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.whatsapp_sent ? (
                            <MessageCircle size={14} className="text-green-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.action_required ? (
                            <span className="text-xs text-orange-400 font-medium">Requer ação</span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-center text-slate-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => reclassify(email.id)}
                            disabled={reclassifying === email.id}
                            title="Re-classificar com IA"
                            className="p-1 hover:text-blue-400 transition-colors disabled:opacity-40"
                          >
                            <RefreshCw size={12} className={reclassifying === email.id ? "animate-spin" : ""} />
                          </button>
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={8} className="px-6 py-4 space-y-2">
                            {email.ai_summary && (
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Resumo IA: </span>
                                <span className="text-xs text-slate-300">{email.ai_summary}</span>
                              </div>
                            )}
                            {email.body_preview && (
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Preview: </span>
                                <span className="text-xs text-slate-400">{email.body_preview.slice(0, 300)}</span>
                              </div>
                            )}
                            <div className="flex gap-4 text-xs text-slate-500">
                              {email.processed_at && (
                                <span>Processado: {format(new Date(email.processed_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</span>
                              )}
                              {email.processing_time_ms && (
                                <span>Tempo: {email.processing_time_ms.toFixed(0)}ms</span>
                              )}
                              {email.whatsapp_sent_at && (
                                <span>WA enviado: {format(new Date(email.whatsapp_sent_at), "HH:mm:ss", { locale: ptBR })}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
