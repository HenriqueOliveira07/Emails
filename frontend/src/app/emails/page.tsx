"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem, reclassifyEmail } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Fragment, useState } from "react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp,
  RefreshCw, Filter,
} from "lucide-react";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [hasAttachments, setHasAttachments] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reclassifying, setReclassifying] = useState<number | null>(null);

  const params: Record<string, string | number | boolean> = { limit: 100 };
  if (priority) params.priority = priority;
  if (hasAttachments === "true") params.has_attachments = true;
  if (hasAttachments === "false") params.has_attachments = false;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, hasAttachments],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];

  async function handleReclassify(id: number) {
    setReclassifying(id);
    try {
      await reclassifyEmail(id);
      refetch();
    } finally {
      setReclassifying(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={14} className="text-slate-400" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas as prioridades</option>
              {PRIORITIES.filter(Boolean).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
            <select
              value={hasAttachments}
              onChange={(e) => setHasAttachments(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Com ou sem anexos</option>
              <option value="true">Com anexos</option>
              <option value="false">Sem anexos</option>
            </select>
            <button
              onClick={() => refetch()}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${data?.total ?? 0} e-mails`}
              </h3>
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
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        Nenhum e-mail encontrado
                      </td>
                    </tr>
                  )}
                  {emails.map((email) => (
                    <Fragment key={email.id}>
                      <tr
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer transition-colors"
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
                          <div className="text-slate-200 truncate max-w-[220px] flex items-center gap-1">
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
                            <span className="flex items-center justify-center gap-1 text-blue-400 text-xs">
                              <Paperclip size={12} />{email.attachment_count}
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
                            onClick={() => handleReclassify(email.id)}
                            disabled={reclassifying === email.id}
                            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50"
                          >
                            {reclassifying === email.id ? "..." : "Reclassificar"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr className="bg-slate-900/50">
                          <td colSpan={8} className="px-6 py-4 space-y-2">
                            <div className="text-xs text-slate-300 leading-relaxed">
                              <span className="text-slate-500 font-medium">Resumo IA: </span>
                              {email.ai_summary || "Sem resumo disponível"}
                            </div>
                            {email.processing_time_ms && (
                              <div className="text-xs text-slate-500">
                                Processado em {email.processing_time_ms.toFixed(0)}ms
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
