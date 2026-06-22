"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmails, reclassifyEmail, updateEmailPriority, EmailItem,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Search, Filter, Paperclip, MessageCircle, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const PRIORITY_OPTIONS = [
  { label: "Todos", value: "" },
  { label: "Crítico", value: "CRITICO" },
  { label: "Alto", value: "ALTO" },
  { label: "Médio", value: "MEDIO" },
  { label: "Baixo", value: "BAIXO" },
];

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments],
    queryFn: () => fetchEmails({
      priority: priority || undefined,
      sender: sender || undefined,
      has_attachments: hasAttachments === "" ? undefined : hasAttachments === "true",
      limit: 100,
    } as Record<string, string | number | boolean>),
  });

  const reclassify = useMutation({
    mutationFn: reclassifyEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emails"] }),
  });

  const updatePriority = useMutation({
    mutationFn: ({ id, priority }: { id: number; priority: string }) =>
      updateEmailPriority(id, priority),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails: EmailItem[] = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 flex items-center gap-1">
                  <Filter size={10} /> Prioridade
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Anexos</label>
                <select
                  value={hasAttachments}
                  onChange={(e) => setHasAttachments(e.target.value)}
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Com anexos</option>
                  <option value="false">Sem anexos</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-slate-400 flex items-center gap-1">
                  <Search size={10} /> Remetente
                </label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="Buscar por remetente..."
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                />
              </div>
              <div className="text-xs text-slate-400 pb-2">
                {emails.length} e-mail(s)
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando...</div>
            ) : (
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
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.length === 0 && (
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
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <select
                              value={email.priority}
                              onChange={(e) =>
                                updatePriority.mutate({ id: email.id, priority: e.target.value })
                              }
                              className={clsx(
                                "text-xs px-2 py-0.5 rounded-md font-medium border cursor-pointer",
                                `priority-badge-${email.priority}`,
                                "bg-transparent"
                              )}
                            >
                              {["CRITICO","ALTO","MEDIO","BAIXO"].map((p) => (
                                <option key={p} value={p} className="bg-slate-800 text-slate-200">
                                  {PRIORITY_LABEL[p]}
                                </option>
                              ))}
                            </select>
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
                          <td className="px-4 py-3 text-slate-400 text-xs">{email.category}</td>
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
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => reclassify.mutate(email.id)}
                                disabled={reclassify.isPending}
                                title="Re-classificar com IA"
                                className="text-slate-400 hover:text-blue-400 transition-colors"
                              >
                                <RefreshCw size={13} className={reclassify.isPending ? "animate-spin" : ""} />
                              </button>
                              <button
                                onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                                className="text-slate-400 hover:text-white transition-colors"
                              >
                                {expanded === email.id
                                  ? <ChevronUp size={13} />
                                  : <ChevronDown size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded === email.id && (
                          <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                            <td colSpan={8} className="px-6 py-4 space-y-2">
                              <p className="text-xs text-slate-300 leading-relaxed">
                                <span className="text-slate-500 font-medium">Resumo IA: </span>
                                {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                              </p>
                              {email.processing_time_ms && (
                                <p className="text-xs text-slate-500">
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
