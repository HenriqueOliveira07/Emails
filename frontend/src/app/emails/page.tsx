"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmails, reclassifyEmail, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Search, Filter, Paperclip, MessageCircle, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_OPTS = [
  { value: "", label: "Todas prioridades" },
  { value: "CRITICO", label: "Crítico" },
  { value: "ALTO", label: "Alto" },
  { value: "MEDIO", label: "Médio" },
  { value: "BAIXO", label: "Baixo" },
];

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const qc = useQueryClient();
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
  });

  const reclassify = useMutation({
    mutationFn: reclassifyEmail,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails: EmailItem[] = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-slate-400 mb-1">Remetente</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => { setSender(e.target.value); setOffset(0); }}
                    placeholder="Filtrar por remetente..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Prioridade</label>
                <div className="relative">
                  <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={priority}
                    onChange={(e) => { setPriority(e.target.value); setOffset(0); }}
                    className="pl-9 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    {PRIORITY_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Anexos</label>
                <select
                  value={hasAttachments}
                  onChange={(e) => { setHasAttachments(e.target.value); setOffset(0); }}
                  className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Com anexos</option>
                  <option value="false">Sem anexos</option>
                </select>
              </div>
              {isFetching && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <RefreshCw size={12} className="animate-spin" />
                  Atualizando...
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                {isLoading ? "Carregando..." : `${emails.length} e-mails`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Recebido</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3"></th>
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
                            {PRIORITY_LABEL[email.priority] || email.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-[150px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[150px]">{email.sender_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[260px] flex items-center gap-1">
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
                            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors disabled:opacity-50"
                          >
                            Re-classificar
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
                              {email.ai_summary || email.body_preview || "Sem resumo"}
                            </div>
                            {email.processing_time_ms != null && (
                              <div className="text-xs text-slate-500">
                                Processado em {email.processing_time_ms.toFixed(0)} ms
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

            {/* Pagination */}
            {emails.length === limit && (
              <div className="px-4 py-3 border-t border-slate-700 flex justify-end gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-white transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
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
