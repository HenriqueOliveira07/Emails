"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmails,
  reclassifyEmail,
  updateEmailPriority,
  EmailItem,
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
  Search,
  Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITIES = ["Todos", "CRITICO", "ALTO", "MEDIO", "BAIXO"];
const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const [priorityFilter, setPriorityFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const params: Record<string, string | number | boolean> = { limit: 100 };
  if (priorityFilter !== "Todos") params.priority = priorityFilter;
  if (search) params.sender = search;

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priorityFilter, search],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const reclassifyMutation = useMutation({
    mutationFn: reclassifyEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emails"] }),
  });

  const priorityMutation = useMutation({
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por remetente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
              <Filter size={14} className="text-slate-400 ml-2" />
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    priorityFilter === p
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {p === "Todos" ? "Todos" : PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500">{emails.length} e-mails</span>
          </div>

          {/* Tabela */}
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
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
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
                            onClick={() => reclassifyMutation.mutate(email.id)}
                            disabled={reclassifyMutation.isPending}
                            className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Re-classificar com IA"
                          >
                            <RefreshCw size={12} className={reclassifyMutation.isPending ? "animate-spin" : ""} />
                          </button>
                          {expanded === email.id ? (
                            <ChevronUp size={14} className="text-slate-400 mx-auto mt-0.5" />
                          ) : (
                            <ChevronDown size={14} className="text-slate-400 mx-auto mt-0.5" />
                          )}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-slate-500 font-medium mb-1">Resumo IA</p>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 font-medium mb-2">Alterar Prioridade</p>
                                <div className="flex gap-2 flex-wrap">
                                  {["CRITICO", "ALTO", "MEDIO", "BAIXO"].map((p) => (
                                    <button
                                      key={p}
                                      onClick={() => priorityMutation.mutate({ id: email.id, priority: p })}
                                      className={clsx(
                                        "px-2 py-1 rounded text-xs font-medium transition-colors",
                                        `priority-badge-${p}`,
                                        email.priority === p && "ring-2 ring-white/30"
                                      )}
                                    >
                                      {PRIORITY_LABEL[p]}
                                    </button>
                                  ))}
                                </div>
                                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                  {email.processing_time_ms && (
                                    <p>Processado em {Math.round(email.processing_time_ms)}ms</p>
                                  )}
                                  {email.processed_at && (
                                    <p>
                                      Processado em{" "}
                                      {format(new Date(email.processed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </p>
                                  )}
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
          </div>
        </main>
      </div>
    </div>
  );
}
