"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmails, reclassifyEmail, updatePriority, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp,
  RefreshCw, Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];
const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const qc = useQueryClient();

  const params: Record<string, string | number | boolean> = { limit, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const reclassify = useMutation({
    mutationFn: (id: number) => reclassifyEmail(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const setPrio = useMutation({
    mutationFn: ({ id, p }: { id: number; p: string }) => updatePriority(id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails: EmailItem[] = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={14} />
              <span className="text-xs font-medium text-slate-300">Filtros</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
              >
                <option value="">Todas</option>
                {PRIORITIES.slice(1).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Remetente</label>
              <input
                type="text"
                value={sender}
                onChange={(e) => { setSender(e.target.value); setOffset(0); }}
                placeholder="email@empresa.com"
                className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 w-48"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>
            <div className="ml-auto text-xs text-slate-400">
              {emails.length} resultados
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
                    <th className="px-4 py-3 text-left">Recebido</th>
                    <th className="px-4 py-3 text-center">Categoria</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
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
                          <div className="text-white font-medium truncate max-w-[140px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-[140px]">{email.sender_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-200 truncate max-w-[220px]">
                            {email.action_required && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                            {email.subject}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-slate-400">{email.category || "—"}</span>
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
                            className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Re-classificar com IA"
                          >
                            <RefreshCw size={12} className={reclassify.isPending ? "animate-spin" : ""} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={9} className="px-6 py-4 space-y-3">
                            <div className="text-xs text-slate-300 leading-relaxed">
                              <span className="text-slate-500 font-medium uppercase tracking-wide">Resumo IA: </span>
                              {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-500">Alterar prioridade:</span>
                              {["CRITICO", "ALTO", "MEDIO", "BAIXO"].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setPrio.mutate({ id: email.id, p })}
                                  className={clsx(
                                    "px-2 py-0.5 rounded text-xs font-medium transition-opacity",
                                    `priority-badge-${p}`,
                                    email.priority === p ? "opacity-100 ring-1 ring-white/30" : "opacity-50 hover:opacity-80"
                                  )}
                                >
                                  {PRIORITY_LABEL[p]}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginação */}
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300 transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-400">
                {offset + 1} – {offset + emails.length}
              </span>
              <button
                disabled={emails.length < limit}
                onClick={() => setOffset(offset + limit)}
                className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300 transition-colors"
              >
                Próxima →
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
