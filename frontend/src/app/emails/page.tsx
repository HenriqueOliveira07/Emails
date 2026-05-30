"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Paperclip, MessageCircle, AlertCircle, Search, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

const PRIORITY_OPTIONS = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments, offset],
    queryFn: () => {
      const params: Record<string, string | number | boolean> = { limit, offset };
      if (priority) params.priority = priority;
      if (sender) params.sender = sender;
      if (hasAttachments === "true") params.has_attachments = true;
      if (hasAttachments === "false") params.has_attachments = false;
      return api.get("/emails", { params }).then((r) => r.data);
    },
    refetchInterval: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    refetch();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <form
            onSubmit={handleSearch}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end"
          >
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-slate-400 mb-1 block">Remetente</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="filtrar por e-mail..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p || "Todas"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
            >
              <Search size={14} />
              Filtrar
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </form>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${emails.length} e-mails`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-2 py-1 text-xs bg-slate-700 disabled:opacity-40 rounded text-white"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={emails.length < limit}
                  className="px-2 py-1 text-xs bg-slate-700 disabled:opacity-40 rounded text-white"
                >
                  Próxima →
                </button>
              </div>
            </div>
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
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Carregando e-mails...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
                          {expanded === email.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-2 text-xs">
                              <p className="text-slate-300 leading-relaxed">
                                <span className="text-slate-500 font-medium">Resumo IA: </span>
                                {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                              </p>
                              <div className="flex gap-4 text-slate-500">
                                {email.processing_time_ms && (
                                  <span>Processado em {email.processing_time_ms.toFixed(0)}ms</span>
                                )}
                                {email.whatsapp_sent_at && (
                                  <span>
                                    WhatsApp:{" "}
                                    {format(new Date(email.whatsapp_sent_at), "dd/MM HH:mm", { locale: ptBR })}
                                  </span>
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
        </main>
      </div>
    </div>
  );
}
