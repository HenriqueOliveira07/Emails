"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp,
  Search, Filter, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"] as const;
const PRIORITY_LABELS: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

interface EmailsResponse {
  items: EmailItem[];
  limit: number;
  offset: number;
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", `priority-badge-${priority}`)}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const limit = 30;

  const params: Record<string, string | number> = { limit, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true" ? "true" : "false";

  const { data, isLoading, refetch } = useQuery<EmailsResponse>({
    queryKey: ["emails", priority, sender, hasAttachments, offset],
    queryFn: () => api.get("/emails", { params }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const emails = data?.items ?? [];

  function reset() {
    setPriority("");
    setSender("");
    setHasAttachments("");
    setOffset(0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => { setPriority(e.target.value); setOffset(0); }}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p ? PRIORITY_LABELS[p] : "Todas"}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Anexos</label>
                <select
                  value={hasAttachments}
                  onChange={(e) => { setHasAttachments(e.target.value); setOffset(0); }}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Com anexos</option>
                  <option value="false">Sem anexos</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs text-slate-400">Remetente</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => { setSender(e.target.value); setOffset(0); }}
                    placeholder="Buscar por remetente..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  <Filter size={12} /> Limpar
                </button>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
                >
                  <RefreshCw size={12} /> Atualizar
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${emails.length} e-mails encontrados`}
              </h3>
              <div className="flex gap-2">
                {offset > 0 && (
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                  >
                    Anterior
                  </button>
                )}
                {emails.length === limit && (
                  <button
                    onClick={() => setOffset(offset + limit)}
                    className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                  >
                    Próximo
                  </button>
                )}
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
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        Carregando e-mails...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        Nenhum e-mail encontrado com os filtros aplicados
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
                          <PriorityBadge priority={email.priority} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium truncate max-w-[160px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[160px]">
                            {email.sender_email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[260px] flex items-center gap-1">
                            {email.action_required && (
                              <AlertCircle size={12} className="text-orange-400 shrink-0" />
                            )}
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
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={7} className="px-6 py-4 space-y-2">
                            <div>
                              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                Resumo IA
                              </span>
                              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                              </p>
                            </div>
                            {email.processed_at && (
                              <p className="text-xs text-slate-500">
                                Processado em:{" "}
                                {format(new Date(email.processed_at), "dd/MM/yyyy HH:mm:ss", {
                                  locale: ptBR,
                                })}
                                {email.processing_time_ms != null &&
                                  ` — ${email.processing_time_ms.toFixed(0)}ms`}
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
