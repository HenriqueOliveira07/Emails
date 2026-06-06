"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem, fetchStats, triggerCheck } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, page],
    queryFn: () =>
      fetchEmails({
        ...(priority && { priority }),
        ...(sender && { sender }),
        limit,
        offset: page * limit,
      }),
    refetchInterval: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por remetente..."
                value={sender}
                onChange={(e) => { setSender(e.target.value); setPage(0); }}
                className="pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(0); }}
                className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas as prioridades</option>
                <option value="CRITICO">Crítico</option>
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Médio</option>
                <option value="BAIXO">Baixo</option>
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            >
              <RefreshCw size={13} />
              Atualizar
            </button>
            <span className="text-sm text-slate-500 ml-auto">{total} e-mails</span>
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
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center">Ação</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
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
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-md text-xs font-medium",
                              `priority-badge-${email.priority}`,
                            )}
                          >
                            {PRIORITY_LABEL[email.priority] || email.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-[140px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[140px]">
                            {email.sender_email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[220px]">
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
                          {email.action_required ? (
                            <AlertCircle size={14} className="text-orange-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
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
                        <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid gap-3">
                              {email.ai_summary && (
                                <div>
                                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                    Resumo IA
                                  </span>
                                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                    {email.ai_summary}
                                  </p>
                                </div>
                              )}
                              {email.body_preview && !email.ai_summary && (
                                <div>
                                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                    Prévia
                                  </span>
                                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {email.body_preview}
                                  </p>
                                </div>
                              )}
                              <div className="flex gap-4 text-xs text-slate-500">
                                {email.processed_at && (
                                  <span>
                                    Processado:{" "}
                                    {format(new Date(email.processed_at), "dd/MM/yyyy HH:mm:ss", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                )}
                                {email.processing_time_ms != null && (
                                  <span>Tempo: {email.processing_time_ms.toFixed(0)}ms</span>
                                )}
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

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-40 hover:border-slate-600 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-400">
                Página {page + 1} de {Math.ceil(total / limit)}
              </span>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white disabled:opacity-40 hover:border-slate-600 transition-colors"
              >
                Próxima
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
