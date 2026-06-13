"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem, api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];
const PRIORITY_LABELS: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reclassifying, setReclassifying] = useState<number | null>(null);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments, offset],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  async function handleReclassify(emailId: number) {
    setReclassifying(emailId);
    try {
      await api.post(`/emails/${emailId}/reclassify`);
      await refetch();
    } finally {
      setReclassifying(null);
    }
  }

  function clearFilters() {
    setPriority("");
    setSender("");
    setHasAttachments("");
    setOffset(0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Filter size={14} />
                <span className="text-xs font-medium">Filtros</span>
              </div>

              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas prioridades</option>
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por remetente..."
                  value={sender}
                  onChange={(e) => { setSender(e.target.value); setOffset(0); }}
                  className="bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none w-44"
                />
              </div>

              <select
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos (com/sem anexos)</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>

              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-slate-700"
              >
                Limpar filtros
              </button>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-slate-400">{total} e-mails</span>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw size={12} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto / Categoria</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-center">Anx</th>
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Carregando e-mails...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Nenhum e-mail encontrado
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
                          <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", `priority-badge-${email.priority}`)}>
                            {PRIORITY_LABELS[email.priority] || email.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-[150px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[150px]">{email.sender_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[250px] flex items-center gap-1">
                            {email.action_required && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                            {email.subject}
                          </div>
                          <div className="text-slate-500 text-xs">{email.category}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.has_attachments ? (
                            <span className="flex items-center justify-center gap-1 text-blue-400 text-xs">
                              <Paperclip size={11} />
                              {email.attachment_count}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.whatsapp_sent ? (
                            <MessageCircle size={14} className="text-green-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleReclassify(email.id)}
                            disabled={reclassifying === email.id}
                            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                          >
                            {reclassifying === email.id ? "..." : "Re-classificar"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={8} className="px-6 py-4 space-y-2">
                            <div className="text-xs text-slate-300 leading-relaxed">
                              <span className="text-slate-500 font-medium">Resumo IA: </span>
                              {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                            </div>
                            {email.processing_time_ms && (
                              <div className="text-xs text-slate-500">
                                Processado em {email.processing_time_ms.toFixed(0)}ms
                                {email.processed_at && (
                                  <> · {format(new Date(email.processed_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {total > limit && (
              <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Mostrando {offset + 1}–{Math.min(offset + limit, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-white transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-white transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
