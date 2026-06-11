"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmails,
  reclassifyEmail,
  updateEmailPriority,
  fetchEmailAttachments,
  EmailItem,
  AttachmentItem,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip,
  MessageCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITIES = ["CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;
const PRIORITY_LABELS: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};
const PRIORITY_COLORS: Record<string, string> = {
  CRITICO: "bg-red-600 text-white",
  ALTO: "bg-orange-500 text-white",
  MEDIO: "bg-yellow-500 text-white",
  BAIXO: "bg-green-600 text-white",
};

function AttachmentPanel({ emailId }: { emailId: number }) {
  const { data: attachments, isLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["attachments", emailId],
    queryFn: () => fetchEmailAttachments(emailId),
  });

  if (isLoading) return <p className="text-xs text-slate-400">Carregando anexos...</p>;
  if (!attachments?.length) return <p className="text-xs text-slate-400">Nenhum anexo</p>;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-1.5 bg-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
        >
          <Paperclip size={10} className="text-blue-400" />
          <span className="max-w-[160px] truncate">{a.original_filename}</span>
          <span className="text-slate-500">
            {a.file_size ? `${(a.file_size / 1024).toFixed(0)} KB` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function EmailsPage() {
  const qc = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [senderFilter, setSenderFilter] = useState("");
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editingPriority, setEditingPriority] = useState<number | null>(null);

  const params: Record<string, string | number | boolean> = { limit: 100 };
  if (priorityFilter) params.priority = priorityFilter;
  if (senderFilter.length > 2) params.sender = senderFilter;
  if (attachmentsOnly) params.has_attachments = true;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 60_000,
  });

  const reclassifyMut = useMutation({
    mutationFn: reclassifyEmail,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const priorityMut = useMutation({
    mutationFn: ({ id, priority }: { id: number; priority: string }) =>
      updateEmailPriority(id, priority),
    onSuccess: () => {
      setEditingPriority(null);
      qc.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  const emails: EmailItem[] = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 overflow-y-auto">

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setPriorityFilter(null)}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  priorityFilter === null
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Todos
              </button>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    priorityFilter === p
                      ? `priority-badge-${p}`
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Filtrar por remetente..."
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
            />

            <button
              onClick={() => setAttachmentsOnly((v) => !v)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-colors",
                attachmentsOnly
                  ? "bg-blue-600/20 border-blue-500 text-blue-400"
                  : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
              )}
            >
              <Filter size={12} />
              Apenas com anexos
            </button>

            <button
              onClick={() => refetch()}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>

          {/* Contagem */}
          <p className="text-xs text-slate-500 mb-3">
            {isLoading ? "Carregando..." : `${emails.length} e-mail(s) encontrado(s)`}
          </p>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        {isLoading ? "Carregando e-mails..." : "Nenhum e-mail encontrado"}
                      </td>
                    </tr>
                  )}
                  {emails.map((email) => (
                    <React.Fragment key={email.id}>
                      <tr
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                      >
                        <td className="px-4 py-3">
                          {editingPriority === email.id ? (
                            <div
                              className="flex flex-col gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {PRIORITIES.map((p) => (
                                <button
                                  key={p}
                                  onClick={() => priorityMut.mutate({ id: email.id, priority: p })}
                                  className={clsx(
                                    "px-2 py-0.5 rounded text-xs font-medium text-left",
                                    `priority-badge-${p}`
                                  )}
                                >
                                  {PRIORITY_LABELS[p]}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span
                              className={clsx(
                                "px-2 py-0.5 rounded-md text-xs font-medium",
                                `priority-badge-${email.priority}`
                              )}
                            >
                              {PRIORITY_LABELS[email.priority] || email.priority}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-[150px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[150px]">
                            {email.sender_email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[220px] flex items-center gap-1">
                            {email.action_required && (
                              <AlertCircle size={12} className="text-orange-400 shrink-0" />
                            )}
                            {email.subject}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[100px]">
                          {email.category}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM/yy HH:mm", {
                                locale: ptBR,
                              })
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
                        <td
                          className="px-4 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                setEditingPriority(
                                  editingPriority === email.id ? null : email.id
                                )
                              }
                              title="Alterar prioridade"
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400 transition-colors"
                            >
                              <Filter size={12} />
                            </button>
                            <button
                              onClick={() => reclassifyMut.mutate(email.id)}
                              disabled={reclassifyMut.isPending}
                              title="Reclassificar com IA"
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-40"
                            >
                              <RefreshCw
                                size={12}
                                className={
                                  reclassifyMut.isPending ? "animate-spin" : ""
                                }
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={9} className="px-6 py-4 space-y-2">
                            {email.ai_summary && (
                              <div className="text-xs text-slate-300">
                                <span className="text-slate-500 font-medium">Resumo IA: </span>
                                {email.ai_summary}
                              </div>
                            )}
                            {email.body_preview && (
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-500 font-medium">Prévia: </span>
                                {email.body_preview.slice(0, 400)}
                              </div>
                            )}
                            {email.has_attachments && (
                              <AttachmentPanel emailId={email.id} />
                            )}
                            {email.processing_time_ms != null && (
                              <p className="text-xs text-slate-600">
                                Processado em {email.processing_time_ms.toFixed(0)} ms
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
