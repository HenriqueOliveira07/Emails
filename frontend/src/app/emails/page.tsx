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
  Paperclip, MessageCircle, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;
const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const qc = useQueryClient();
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<"" | "true" | "false">("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const params: Record<string, string | number | boolean> = { limit: 100, offset: 0 };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 60_000,
  });

  const reclassify = useMutation({
    mutationFn: (id: number) => reclassifyEmail(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const updatePriority = useMutation({
    mutationFn: ({ id, p }: { id: number; p: string }) => updateEmailPriority(id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails = data?.items ?? [];

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
              <span className="text-sm text-slate-300 font-medium">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas as prioridades</option>
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Filtrar por remetente..."
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
              />

              <select
                value={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.value as "" | "true" | "false")}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Com ou sem anexos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>

              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
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
                {emails.length} e-mail{emails.length !== 1 ? "s" : ""} encontrado{emails.length !== 1 ? "s" : ""}
              </h3>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Prioridade</th>
                      <th className="px-4 py-3 text-left">Remetente</th>
                      <th className="px-4 py-3 text-left">Assunto</th>
                      <th className="px-4 py-3 text-left">Recebido</th>
                      <th className="px-4 py-3 text-center">Anexos</th>
                      <th className="px-4 py-3 text-center">WA</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
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
                            <select
                              value={email.priority}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updatePriority.mutate({ id: email.id, p: e.target.value })}
                              className={clsx(
                                "text-xs rounded-md px-2 py-0.5 border cursor-pointer bg-transparent",
                                `priority-badge-${email.priority}`
                              )}
                            >
                              {PRIORITIES.filter(Boolean).map((p) => (
                                <option key={p} value={p} className="bg-slate-800 text-slate-200">{PRIORITY_LABEL[p]}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-white font-medium truncate max-w-[160px]">
                              {email.sender_name || email.sender_email}
                            </div>
                            <div className="text-slate-400 text-xs truncate max-w-[160px]">{email.sender_email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-200 truncate max-w-[260px] flex items-center gap-1">
                              {email.action_required && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                              {email.subject}
                            </div>
                            <div className="text-slate-500 text-xs">{email.category}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {email.whatsapp_sent
                              ? <MessageCircle size={14} className="text-green-400 mx-auto" />
                              : <span className="text-slate-600 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => reclassify.mutate(email.id)}
                                disabled={reclassify.isPending}
                                title="Re-classificar com IA"
                                className="p-1 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                              >
                                <RefreshCw size={12} className={reclassify.isPending ? "animate-spin" : ""} />
                              </button>
                              <button
                                onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                                className="p-1 text-slate-400 hover:text-white transition-colors"
                              >
                                {expanded === email.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded === email.id && (
                          <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                            <td colSpan={7} className="px-6 py-4 space-y-2">
                              <div className="text-xs text-slate-300 leading-relaxed">
                                <span className="text-slate-500 font-medium">Resumo IA: </span>
                                {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                              </div>
                              {email.processing_time_ms && (
                                <div className="text-xs text-slate-500">
                                  Processado em {Math.round(email.processing_time_ms)}ms
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
