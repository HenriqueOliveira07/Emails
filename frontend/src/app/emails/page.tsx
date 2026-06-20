"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmails, reclassifyEmail, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Paperclip, MessageCircle, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, Search, Filter,
} from "lucide-react";
import { clsx } from "clsx";

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;
const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const qc = useQueryClient();
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [senderInput, setSenderInput] = useState("");
  const [hasAttachments, setHasAttachments] = useState<boolean | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== undefined) params.has_attachments = hasAttachments;

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments, offset],
    queryFn: () => fetchEmails(params),
  });

  const reclassify = useMutation({
    mutationFn: reclassifyEmail,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  function applySearch() {
    setSender(senderInput);
    setOffset(0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <Filter size={14} className="text-slate-400" />

            {/* Priority filter */}
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p || "all"}
                  onClick={() => { setPriority(p); setOffset(0); }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    priority === p
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  )}
                >
                  {p ? PRIORITY_LABEL[p] : "Todos"}
                </button>
              ))}
            </div>

            {/* Attachments filter */}
            <div className="flex gap-1">
              {[
                { label: "Com anexos", value: true },
                { label: "Sem anexos", value: false },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => {
                    setHasAttachments(hasAttachments === value ? undefined : value);
                    setOffset(0);
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs transition-colors",
                    hasAttachments === value
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sender search */}
            <div className="flex gap-2 ml-auto">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar remetente..."
                  value={senderInput}
                  onChange={(e) => setSenderInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  className="pl-7 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                />
              </div>
              <button
                onClick={applySearch}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Results count */}
          <div className="text-xs text-slate-400">
            {total} e-mail{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            {offset > 0 && ` — página ${Math.floor(offset / limit) + 1}`}
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto / Categoria</th>
                    <th className="px-4 py-3 text-left">Recebido</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3" />
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
                        Nenhum e-mail encontrado com estes filtros
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
                          <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium border", `priority-badge-${email.priority}`)}>
                            {PRIORITY_LABEL[email.priority] || email.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white text-xs font-medium truncate max-w-[150px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[150px]">{email.sender_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-200 text-xs truncate max-w-[260px]">
                            {email.action_required && <AlertCircle size={11} className="text-orange-400 shrink-0" />}
                            {email.subject}
                          </div>
                          <div className="text-slate-500 text-xs truncate max-w-[260px]">{email.category}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.whatsapp_sent ? (
                            <MessageCircle size={13} className="text-green-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => reclassify.mutate(email.id)}
                            disabled={reclassify.isPending}
                            title="Re-classificar com IA"
                            className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                          >
                            <RefreshCw size={12} className={reclassify.isPending ? "animate-spin" : ""} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={8} className="px-6 py-4 space-y-1">
                            <p className="text-xs text-slate-400 font-medium">Resumo IA:</p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                            </p>
                            {email.whatsapp_sent_at && (
                              <p className="text-xs text-slate-500">
                                WhatsApp enviado:{" "}
                                {format(new Date(email.whatsapp_sent_at), "dd/MM HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-xs text-white transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-400">
                {offset + 1}–{Math.min(offset + limit, total)} de {total}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-xs text-white transition-colors"
              >
                Próximo →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
