"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Mail, Paperclip, MessageCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_COLORS: Record<string, string> = {
  CRITICO: "bg-red-100 text-red-800 border border-red-200",
  ALTO: "bg-orange-100 text-orange-800 border border-orange-200",
  MEDIO: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  BAIXO: "bg-green-100 text-green-800 border border-green-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICO: "🔴 CRÍTICO",
  ALTO: "🟠 ALTO",
  MEDIO: "🟡 MÉDIO",
  BAIXO: "🟢 BAIXO",
};

type Priority = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO" | "";

export default function EmailsPage() {
  const [priority, setPriority] = useState<Priority>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const limit = 20;

  const params: Record<string, string | number | boolean> = { limit, offset: page * limit };
  if (priority) params.priority = priority;

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, page],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  const filtered = search
    ? emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(search.toLowerCase()) ||
          e.sender_email.toLowerCase().includes(search.toLowerCase()) ||
          e.sender_name.toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Buscar por assunto, remetente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-sm w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value as Priority); setPage(0); }}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas as prioridades</option>
              <option value="CRITICO">🔴 Crítico</option>
              <option value="ALTO">🟠 Alto</option>
              <option value="MEDIO">🟡 Médio</option>
              <option value="BAIXO">🟢 Baixo</option>
            </select>
            <span className="ml-auto text-sm text-slate-400 self-center">
              {total} e-mail{total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Tabela */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-slate-400 py-12">Nenhum e-mail encontrado.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 text-left">
                    <th className="px-4 py-3 w-28">Prioridade</th>
                    <th className="px-4 py-3">Remetente</th>
                    <th className="px-4 py-3">Assunto</th>
                    <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Recebido</th>
                    <th className="px-4 py-3 w-24 text-center">Status</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((email) => (
                    <>
                      <tr
                        key={email.id}
                        className="border-b border-slate-700 hover:bg-slate-750 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                      >
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PRIORITY_COLORS[email.priority] ?? ""}`}>
                            {PRIORITY_LABELS[email.priority] ?? email.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200 truncate max-w-[160px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          {email.sender_name && (
                            <div className="text-slate-500 text-xs truncate max-w-[160px]">{email.sender_email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 truncate max-w-[280px]">{email.subject}</div>
                          {email.action_required && (
                            <span className="inline-flex items-center gap-1 text-orange-400 text-xs mt-0.5">
                              <AlertTriangle size={11} /> Ação necessária
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-400 text-xs">{email.category}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">
                          {email.received_at
                            ? format(new Date(email.received_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {email.has_attachments && (
                              <Paperclip size={14} className="text-slate-400" title={`${email.attachment_count} anexo(s)`} />
                            )}
                            {email.whatsapp_sent && (
                              <MessageCircle size={14} className="text-green-400" title="WhatsApp enviado" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === email.id && (
                        <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-2">
                              <div>
                                <span className="text-slate-400 text-xs uppercase tracking-wide">Resumo IA</span>
                                <p className="text-slate-300 text-sm mt-1">{email.ai_summary || "—"}</p>
                              </div>
                              {email.processing_time_ms && (
                                <p className="text-slate-500 text-xs">
                                  Processado em {email.processing_time_ms.toFixed(0)}ms
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginação */}
          {total > limit && (
            <div className="flex justify-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-600"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-slate-400 text-sm">
                Página {page + 1} de {Math.ceil(total / limit)}
              </span>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-600"
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
