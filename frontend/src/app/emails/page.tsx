"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Paperclip, MessageCircle, ChevronDown, ChevronUp, Search, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { fetchEmails, EmailItem, Priority, reclassifyEmail } from "@/lib/api";

const PRIORITIES: { value: Priority | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "CRITICO", label: "Crítico" },
  { value: "ALTO", label: "Alto" },
  { value: "MEDIO", label: "Médio" },
  { value: "BAIXO", label: "Baixo" },
];

const BADGE = {
  CRITICO: "priority-badge-CRITICO",
  ALTO: "priority-badge-ALTO",
  MEDIO: "priority-badge-MEDIO",
  BAIXO: "priority-badge-BAIXO",
};

function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-semibold", BADGE[p])}>
      {p}
    </span>
  );
}

function EmailRow({ email }: { email: EmailItem }) {
  const [expanded, setExpanded] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);

  const handleReclassify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReclassifying(true);
    try {
      await reclassifyEmail(email.id);
    } finally {
      setReclassifying(false);
    }
  };

  return (
    <>
      <tr
        className="border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <PriorityBadge p={email.priority} />
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-white">{email.sender_name || email.sender_email}</p>
          <p className="text-xs text-slate-400">{email.sender_email}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-white line-clamp-1">{email.subject}</p>
          {email.category && (
            <span className="text-xs text-blue-400">{email.category}</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          {email.received_at
            ? format(parseISO(email.received_at), "dd/MM HH:mm", { locale: ptBR })
            : "—"}
        </td>
        <td className="px-4 py-3 text-center">
          {email.has_attachments && (
            <span className="flex items-center gap-1 text-xs text-slate-300 justify-center">
              <Paperclip size={12} />
              {email.attachment_count}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {email.whatsapp_sent && <MessageCircle size={14} className="text-green-400 mx-auto" />}
        </td>
        <td className="px-4 py-3 text-center">
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400 mx-auto" />
          ) : (
            <ChevronDown size={14} className="text-slate-400 mx-auto" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-800/30">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-3">
              {email.ai_summary && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Resumo IA</p>
                  <p className="text-sm text-slate-300">{email.ai_summary}</p>
                </div>
              )}
              {email.body_preview && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Preview</p>
                  <p className="text-sm text-slate-400 line-clamp-4">{email.body_preview}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {email.processing_time_ms && (
                  <span>Processado em {email.processing_time_ms.toFixed(0)} ms</span>
                )}
                {email.action_required && (
                  <span className="text-orange-400 font-semibold">Ação necessária</span>
                )}
                <button
                  onClick={handleReclassify}
                  disabled={reclassifying}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  <RefreshCw size={11} className={reclassifying ? "animate-spin" : ""} />
                  Reclassificar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EmailsPage() {
  const [priority, setPriority] = useState<Priority | "">("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const params: Record<string, string | number | boolean> = { limit: LIMIT, offset };
  if (priority) params.priority = priority;
  if (search) params.sender = search;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails-page", priority, search, offset],
    queryFn: () => fetchEmails(params),
    refetchInterval: 60_000,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por remetente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {PRIORITIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setPriority(value as Priority | ""); setOffset(0); }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    priority === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-400" />
                <span className="text-sm font-semibold text-white">E-mails</span>
              </div>
              <span className="text-xs text-slate-400">{total} encontrados</span>
            </div>

            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-slate-500 py-12">Nenhum e-mail encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-700">
                      <th className="px-4 py-2 text-left">Prioridade</th>
                      <th className="px-4 py-2 text-left">Remetente</th>
                      <th className="px-4 py-2 text-left">Assunto</th>
                      <th className="px-4 py-2 text-left">Horário</th>
                      <th className="px-4 py-2 text-center">Anexos</th>
                      <th className="px-4 py-2 text-center">WhatsApp</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((email) => (
                      <EmailRow key={email.id} email={email} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-700 text-slate-300"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500">
                  {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
                </span>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-700 text-slate-300"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
