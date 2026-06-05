"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmails, reclassifyEmail, updatePriority, fetchEmail,
  EmailItem, EmailDetail,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Mail, Paperclip, MessageCircle, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, Search, Filter, X,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_LABELS: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

const PRIORITY_OPTIONS = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [hasAttachments, setHasAttachments] = useState<"" | "true" | "false">("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset };
  if (priorityFilter) params.priority = priorityFilter;
  if (hasAttachments) params.has_attachments = hasAttachments === "true";
  if (search) params.sender = search;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const { data: detail } = useQuery({
    queryKey: ["email-detail", expanded],
    queryFn: () => expanded ? fetchEmail(expanded) : null,
    enabled: expanded !== null,
  });

  const reclassify = useMutation({
    mutationFn: reclassifyEmail,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const changePriority = useMutation({
    mutationFn: ({ id, priority }: { id: number; priority: string }) =>
      updatePriority(id, priority),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  const resetFilters = () => {
    setSearch("");
    setPriorityFilter("");
    setHasAttachments("");
    setOffset(0);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                  placeholder="Buscar por remetente..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setOffset(0); }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas prioridades</option>
                {PRIORITY_OPTIONS.slice(1).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
              <select
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value as "" | "true" | "false"); setOffset(0); }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Com/sem anexos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
              {(search || priorityFilter || hasAttachments) && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm"
                >
                  <X size={14} /> Limpar
                </button>
              )}
              <div className="ml-auto text-slate-400 text-sm">
                {isFetching ? "Atualizando..." : `${total} e-mail(s)`}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
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
                          <div className="text-slate-200 truncate max-w-[220px] flex items-center gap-1">
                            {email.action_required && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                            {email.subject}
                          </div>
                          <div className="text-slate-500 text-xs">{email.category}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.has_attachments ? (
                            <span className="flex items-center justify-center gap-1 text-blue-400">
                              <Paperclip size={12} />
                              <span className="text-xs">{email.attachment_count}</span>
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.whatsapp_sent
                            ? <MessageCircle size={14} className="text-green-400 mx-auto" />
                            : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => reclassify.mutate(email.id)}
                            disabled={reclassify.isPending}
                            title="Re-classificar com IA"
                            className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                          >
                            <RefreshCw size={13} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>

                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-slate-500 uppercase mb-1">Resumo IA</p>
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                    {detail?.ai_summary || email.ai_summary || "Sem resumo"}
                                  </p>
                                </div>
                                {detail?.keywords_found && detail.keywords_found.length > 0 && (
                                  <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Palavras-chave</p>
                                    <div className="flex flex-wrap gap-1">
                                      {detail.keywords_found.map((kw) => (
                                        <span key={kw} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{kw}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-slate-500 uppercase mb-1">Prévia do conteúdo</p>
                                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">
                                    {detail?.body_preview || email.body_preview}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-slate-500 uppercase mb-1">Alterar Prioridade</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {["CRITICO", "ALTO", "MEDIO", "BAIXO"].map((p) => (
                                      <button
                                        key={p}
                                        onClick={() => changePriority.mutate({ id: email.id, priority: p })}
                                        className={clsx(
                                          "px-2 py-1 rounded text-xs font-medium transition-colors",
                                          email.priority === p
                                            ? `priority-badge-${p}`
                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        )}
                                      >
                                        {PRIORITY_LABELS[p]}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <p className="text-slate-500 uppercase">Categoria</p>
                                    <p className="text-slate-300 mt-0.5">{email.category}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 uppercase">Processamento</p>
                                    <p className="text-slate-300 mt-0.5">
                                      {email.processing_time_ms ? `${email.processing_time_ms.toFixed(0)}ms` : "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 uppercase">Ação necessária</p>
                                    <p className={clsx("mt-0.5", email.action_required ? "text-orange-400" : "text-slate-400")}>
                                      {email.action_required ? "Sim" : "Não"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 uppercase">WhatsApp</p>
                                    <p className={clsx("mt-0.5", email.whatsapp_sent ? "text-green-400" : "text-slate-400")}>
                                      {email.whatsapp_sent ? "Enviado" : "Não enviado"}
                                    </p>
                                  </div>
                                </div>
                              </div>
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
            {total > limit && (
              <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-400">
                  {offset + 1}–{Math.min(offset + limit, total)} de {total}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded disabled:opacity-40"
                >
                  Próximo
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
