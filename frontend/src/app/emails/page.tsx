"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, MessageCircle, AlertCircle, Search, Filter } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", { priority, sender, hasAttachments, page }],
    queryFn: () =>
      fetchEmails({
        ...(priority ? { priority } : {}),
        ...(sender ? { sender } : {}),
        ...(hasAttachments !== "" ? { has_attachments: hasAttachments === "true" } : {}),
        limit,
        offset: page * limit,
      }),
    refetchInterval: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  function clearFilters() {
    setPriority("");
    setSender("");
    setHasAttachments("");
    setPage(0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter size={14} className="text-slate-400 shrink-0" />
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por remetente..."
                  value={sender}
                  onChange={(e) => { setSender(e.target.value); setPage(0); }}
                  className="pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-52"
                />
              </div>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(0); }}
                className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas as prioridades</option>
                <option value="CRITICO">CRÍTICO</option>
                <option value="ALTO">ALTO</option>
                <option value="MEDIO">MÉDIO</option>
                <option value="BAIXO">BAIXO</option>
              </select>
              <select
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value); setPage(0); }}
                className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Com ou sem anexos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
              {(priority || sender || hasAttachments) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Limpar filtros
                </button>
              )}
              <span className="ml-auto text-xs text-slate-400">{total} e-mail(s)</span>
            </div>
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
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-left">Recebido</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
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
                    <tr
                      key={email.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", `priority-badge-${email.priority}`)}>
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
                        <div className="text-slate-200 text-xs truncate max-w-[220px] flex items-center gap-1">
                          {email.action_required && <AlertCircle size={11} className="text-orange-400 shrink-0" />}
                          {email.subject}
                        </div>
                        {email.ai_summary && (
                          <div className="text-slate-500 text-xs truncate max-w-[220px] mt-0.5">{email.ai_summary}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{email.category || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
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
                        {email.whatsapp_sent
                          ? <MessageCircle size={13} className="text-green-400 mx-auto" />
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {email.action_required
                          ? <AlertCircle size={13} className="text-orange-400 mx-auto" />
                          : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {total > limit && (
              <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Mostrando {page * limit + 1}–{Math.min((page + 1) * limit, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-700 text-white disabled:opacity-40 hover:bg-slate-600 transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * limit >= total}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-700 text-white disabled:opacity-40 hover:bg-slate-600 transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
