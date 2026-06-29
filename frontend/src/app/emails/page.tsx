"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmails, reclassifyEmail, updatePriority, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, MessageCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Search, Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRITICO", ALTO: "ALTO", MEDIO: "MEDIO", BAIXO: "BAIXO",
};
const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [attachOnly, setAttachOnly] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset: page * limit };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (attachOnly) params.has_attachments = true;

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender, attachOnly, page],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const reclassify = useMutation({
    mutationFn: (id: number) => reclassifyEmail(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emails"] }),
  });

  const changePriority = useMutation({
    mutationFn: ({ id, p }: { id: number; p: string }) => updatePriority(id, p),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emails"] }),
  });

  const emails = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <Filter size={16} className="text-slate-400" />
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(0); }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="">Todas Prioridades</option>
              {PRIORITIES.filter(Boolean).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar remetente..."
                value={sender}
                onChange={(e) => { setSender(e.target.value); setPage(0); }}
                className="bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-400 w-56"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={attachOnly}
                onChange={(e) => { setAttachOnly(e.target.checked); setPage(0); }}
                className="rounded border-slate-500"
              />
              Com anexos
            </label>
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
                    <th className="px-4 py-3 text-left">Horario</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WA</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Carregando...</td></tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum e-mail encontrado</td></tr>
                  )}
                  {emails.map((email) => (
                    <EmailRow
                      key={email.id}
                      email={email}
                      expanded={expanded === email.id}
                      onToggle={() => setExpanded(expanded === email.id ? null : email.id)}
                      onReclassify={() => reclassify.mutate(email.id)}
                      onChangePriority={(p: string) => changePriority.mutate({ id: email.id, p })}
                      reclassifying={reclassify.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-700 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Pagina {page + 1} &middot; {emails.length} resultados
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={emails.length < limit}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300"
                >
                  Proximo
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function EmailRow({
  email, expanded, onToggle, onReclassify, onChangePriority, reclassifying,
}: {
  email: EmailItem;
  expanded: boolean;
  onToggle: () => void;
  onReclassify: () => void;
  onChangePriority: (p: string) => void;
  reclassifying: boolean;
}) {
  return (
    <>
      <tr
        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
        onClick={onToggle}
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
          <div className="text-slate-200 truncate max-w-[200px] flex items-center gap-1">
            {email.action_required && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
            {email.subject}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400">{email.category}</td>
        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
          {email.received_at ? format(new Date(email.received_at), "dd/MM HH:mm", { locale: ptBR }) : "--"}
        </td>
        <td className="px-4 py-3 text-center">
          {email.has_attachments ? (
            <span className="flex items-center justify-center gap-1 text-blue-400">
              <Paperclip size={12} /><span className="text-xs">{email.attachment_count}</span>
            </span>
          ) : <span className="text-slate-600">--</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {email.whatsapp_sent ? <MessageCircle size={14} className="text-green-400 mx-auto" /> : <span className="text-slate-600 text-xs">--</span>}
        </td>
        <td className="px-4 py-3 text-center text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-900/50">
          <td colSpan={8} className="px-6 py-4">
            <div className="space-y-3">
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="text-slate-500 font-medium">Resumo IA: </span>
                {email.ai_summary || email.body_preview || "Sem resumo disponivel"}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onReclassify(); }}
                  disabled={reclassifying}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white"
                >
                  <RefreshCw size={10} className={reclassifying ? "animate-spin" : ""} />
                  Reclassificar
                </button>
                <select
                  value={email.priority}
                  onChange={(e) => { e.stopPropagation(); onChangePriority(e.target.value); }}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="CRITICO">CRITICO</option>
                  <option value="ALTO">ALTO</option>
                  <option value="MEDIO">MEDIO</option>
                  <option value="BAIXO">BAIXO</option>
                </select>
                {email.processing_time_ms && (
                  <span className="text-xs text-slate-500">Processado em {email.processing_time_ms.toFixed(0)}ms</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
