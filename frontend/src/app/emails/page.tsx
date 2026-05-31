"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmails, updateEmailPriority, reclassifyEmail,
  EmailItem,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, MessageCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
  Search, Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};
const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

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
  if (hasAttachments === "true") params.has_attachments = true;
  if (hasAttachments === "false") params.has_attachments = false;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    staleTime: 20_000,
  });

  const reclassify = useMutation({
    mutationFn: reclassifyEmail,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const changePriority = useMutation({
    mutationFn: ({ id, p }: { id: number; p: string }) => updateEmailPriority(id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails: EmailItem[] = data?.items ?? [];

  function applyFilters() {
    setOffset(0);
    qc.invalidateQueries({ queryKey: ["emails"] });
  }

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
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p ? PRIORITY_LABEL[p] : "Todas"}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Remetente</label>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="filtrar por remetente"
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>
            <button
              onClick={applyFilters}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
            >
              <Filter size={12} />
              Filtrar
            </button>
            {isFetching && <RefreshCw size={14} className="text-blue-400 animate-spin self-end mb-1" />}
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${emails.length} e-mails`}
              </h3>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300"
                >
                  Anterior
                </button>
                <button
                  disabled={emails.length < limit}
                  onClick={() => setOffset(offset + limit)}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300"
                >
                  Próximo
                </button>
              </div>
            </div>
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
                    <th className="px-4 py-3 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
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
                          <select
                            value={email.priority}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => changePriority.mutate({ id: email.id, p: e.target.value })}
                            className={clsx(
                              "text-xs rounded px-1.5 py-0.5 border cursor-pointer focus:outline-none",
                              `priority-badge-${email.priority}`
                            )}
                          >
                            {["CRITICO", "ALTO", "MEDIO", "BAIXO"].map((p) => (
                              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-[150px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[150px]">{email.sender_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[220px] flex items-center gap-1">
                            {email.action_required && <AlertCircle size={11} className="text-orange-400 shrink-0" />}
                            {email.subject}
                          </div>
                          <div className="text-slate-500 text-xs truncate max-w-[220px]">{email.category}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.has_attachments ? (
                            <span className="flex items-center justify-center gap-1 text-blue-400">
                              <Paperclip size={11} />
                              <span className="text-xs">{email.attachment_count}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {email.whatsapp_sent
                            ? <MessageCircle size={13} className="text-green-400 mx-auto" />
                            : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => reclassify.mutate(email.id)}
                            disabled={reclassify.isPending}
                            title="Re-classificar com IA"
                            className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-40"
                          >
                            <RefreshCw size={12} className={reclassify.isPending ? "animate-spin" : ""} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={8} className="px-6 py-4">
                            <p className="text-xs text-slate-400 mb-1 font-medium">Resumo IA:</p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                            </p>
                            {email.processing_time_ms && (
                              <p className="text-xs text-slate-500 mt-2">
                                Processado em {email.processing_time_ms.toFixed(0)}ms
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
        </main>
      </div>
    </div>
  );
}
