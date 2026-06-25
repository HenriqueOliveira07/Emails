"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmails,
  fetchEmailDetail,
  fetchEmailAttachments,
  reclassifyEmail,
  updateEmailPriority,
  EmailItem,
  EmailDetail,
  AttachmentItem,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Search,
  Paperclip,
  MessageCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const PRIORITIES = ["CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;
type Priority = (typeof PRIORITIES)[number];

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        `priority-badge-${priority}`
      )}
    >
      {priority}
    </span>
  );
}

function AttachmentsList({ attachments }: { attachments: AttachmentItem[] }) {
  if (!attachments.length) return <p className="text-slate-500 text-sm">Nenhum anexo.</p>;
  return (
    <div className="space-y-2">
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3 text-sm">
          <FileText size={16} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white truncate">{a.original_filename}</p>
            <p className="text-slate-400 text-xs">
              {a.file_type} · {(a.file_size / 1024).toFixed(1)} KB
              {a.has_pdf_text && " · PDF extraído"}
              {a.has_ocr && " · OCR"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailModal({
  email,
  onClose,
}: {
  email: EmailDetail;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: attachments } = useQuery({
    queryKey: ["email-attachments", email.id],
    queryFn: () => fetchEmailAttachments(email.id),
    enabled: email.has_attachments,
  });

  const reclass = useMutation({
    mutationFn: () => reclassifyEmail(email.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const [selectedPriority, setSelectedPriority] = useState(email.priority);
  const updatePrio = useMutation({
    mutationFn: (p: string) => updateEmailPriority(email.id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-end">
      <div className="w-full max-w-2xl h-full bg-slate-900 border-l border-slate-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-start gap-3 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <PriorityBadge priority={email.priority} />
              <span className="text-xs text-slate-400">{email.category}</span>
            </div>
            <h2 className="text-white font-semibold text-sm leading-tight">{email.subject}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Remetente</p>
              <p className="text-white">
                {email.sender_name && <span className="font-medium">{email.sender_name} </span>}
                <span className="text-slate-400">&lt;{email.sender_email}&gt;</span>
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Recebido</p>
              <p className="text-white">
                {email.received_at
                  ? formatDistanceToNow(new Date(email.received_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : "—"}
              </p>
            </div>
            {email.recipients?.length > 0 && (
              <div className="col-span-2">
                <p className="text-slate-500 text-xs mb-0.5">Para</p>
                <p className="text-slate-300 text-xs">{email.recipients.join(", ")}</p>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {email.ai_summary && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-400 mb-1">Resumo IA</p>
              <p className="text-slate-300 text-sm leading-relaxed">{email.ai_summary}</p>
            </div>
          )}

          {/* Action required */}
          {email.action_required && (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <AlertCircle size={14} className="text-orange-400 flex-shrink-0" />
              <p className="text-orange-300 text-sm">Ação necessária</p>
            </div>
          )}

          {/* Keywords */}
          {email.keywords_found?.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs mb-2">Palavras-chave detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {email.keywords_found.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div>
            <p className="text-slate-500 text-xs mb-2">Corpo do e-mail</p>
            <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
              {email.full_body || email.body_preview || "(sem conteúdo)"}
            </div>
          </div>

          {/* Attachments */}
          {email.has_attachments && (
            <div>
              <p className="text-slate-500 text-xs mb-2">
                Anexos ({email.attachment_count})
              </p>
              <AttachmentsList attachments={attachments ?? []} />
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-slate-700 pt-4 space-y-3">
            <div>
              <p className="text-slate-500 text-xs mb-2">Alterar prioridade</p>
              <div className="flex gap-2 flex-wrap">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPriority(p as Priority);
                      updatePrio.mutate(p);
                    }}
                    className={clsx(
                      "px-2.5 py-1 rounded text-xs font-medium border transition-colors",
                      selectedPriority === p
                        ? `priority-badge-${p}`
                        : "border-slate-600 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => reclass.mutate()}
              disabled={reclass.isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
            >
              <RefreshCw size={12} className={reclass.isPending ? "animate-spin" : ""} />
              {reclass.isPending ? "Reclassificando..." : "Re-classificar com IA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmailsPage() {
  const [priority, setPriority] = useState<string>("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [sender, setSender] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset };
  if (priority) params.priority = priority;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";
  if (sender) params.sender = sender;

  const { data, isLoading } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const { data: detail } = useQuery({
    queryKey: ["email-detail", selectedId],
    queryFn: () => fetchEmailDetail(selectedId!),
    enabled: selectedId !== null,
  });

  const emails: EmailItem[] = data?.items ?? [];

  function clearFilters() {
    setPriority("");
    setHasAttachments("");
    setSender("");
    setOffset(0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-slate-400 mb-1">Buscar remetente</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => { setSender(e.target.value); setOffset(0); }}
                  placeholder="email@empresa.com"
                  className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            {(priority || hasAttachments || sender) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
              >
                <X size={14} />
                Limpar
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">Carregando e-mails...</div>
            ) : emails.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Nenhum e-mail encontrado.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 w-24">Prioridade</th>
                    <th className="px-4 py-3">Remetente</th>
                    <th className="px-4 py-3">Assunto</th>
                    <th className="px-4 py-3 w-32">Recebido</th>
                    <th className="px-4 py-3 w-20 text-center">Anexos</th>
                    <th className="px-4 py-3 w-20 text-center">WA</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr
                      key={email.id}
                      onClick={() => setSelectedId(email.id)}
                      className="border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <PriorityBadge priority={email.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium truncate max-w-[180px]">
                          {email.sender_name || email.sender_email}
                        </p>
                        <p className="text-slate-400 text-xs truncate max-w-[180px]">
                          {email.sender_email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {email.action_required && (
                            <AlertCircle size={13} className="text-orange-400 flex-shrink-0" />
                          )}
                          <p className="text-white truncate max-w-[300px]">{email.subject}</p>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">{email.category}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {email.received_at
                          ? formatDistanceToNow(new Date(email.received_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {email.has_attachments ? (
                          <span className="flex items-center justify-center gap-1 text-blue-400 text-xs">
                            <Paperclip size={12} />
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {(data?.items.length ?? 0) >= limit && (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm text-white"
              >
                Anterior
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white"
              >
                Próximo
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Detail panel */}
      {selectedId !== null && detail && (
        <EmailModal email={detail} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
