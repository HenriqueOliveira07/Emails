"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem, triggerCheck } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

const PRIORITY_OPTIONS = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const limit = 50;

  const params: Record<string, string | number | boolean> = {
    limit,
    offset: page * limit,
  };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments === "true") params.has_attachments = true;
  if (hasAttachments === "false") params.has_attachments = false;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments, page],
    queryFn: () => fetchEmails(params),
    refetchInterval: 60_000,
  });

  const emails: EmailItem[] = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(0); }}
                className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">Todas</option>
                {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Remetente</label>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={sender}
                  onChange={(e) => { setSender(e.target.value); setPage(0); }}
                  placeholder="email@dominio.com"
                  className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-sm w-52"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value); setPage(0); }}
                className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 transition-colors"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
            {(priority || sender || hasAttachments) && (
              <button
                onClick={() => { setPriority(""); setSender(""); setHasAttachments(""); setPage(0); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors"
              >
                <Filter size={12} />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Table */}
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
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-left">Recebido</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center"></th>
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
                          <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", `priority-badge-${email.priority}`)}>
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
                          <div className="text-slate-200 truncate max-w-[260px] flex items-center gap-1">
                            {email.action_required && (
                              <AlertCircle size={12} className="text-orange-400 shrink-0" />
                            )}
                            {email.subject}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{email.category || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.has_attachments ? (
                            <span className="flex items-center justify-center gap-1 text-blue-400">
                              <Paperclip size={12} />
                              <span className="text-xs">{email.attachment_count}</span>
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
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={8} className="px-6 py-4 space-y-2">
                            {email.ai_summary && (
                              <div className="text-xs text-slate-300 leading-relaxed">
                                <span className="text-slate-500 font-medium">Resumo IA: </span>
                                {email.ai_summary}
                              </div>
                            )}
                            {email.body_preview && !email.ai_summary && (
                              <div className="text-xs text-slate-400 leading-relaxed">
                                {email.body_preview}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              {email.processing_time_ms && (
                                <span>Processado em {email.processing_time_ms.toFixed(0)}ms</span>
                              )}
                              {email.processed_at && (
                                <span>
                                  Classificado: {format(new Date(email.processed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                </span>
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
            {/* Pagination */}
            {emails.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-400">Página {page + 1}</span>
                <button
                  disabled={emails.length < limit}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
