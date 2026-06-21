"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";
import {
  Search,
  Paperclip,
  MessageCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailItem } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";
const api = axios.create({ baseURL: BASE + "/api" });

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

const LIMIT = 50;

interface EmailsResponse {
  items: EmailItem[];
  limit: number;
  offset: number;
}

interface Filters {
  priority: string;
  sender: string;
  has_attachments: boolean;
}

// ─── Skeleton row ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-700/50">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-slate-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmailsPage() {
  const queryClient = useQueryClient();

  // Filter form state (controlled — only applied on search click)
  const [draftFilters, setDraftFilters] = useState<Filters>({
    priority: "",
    sender: "",
    has_attachments: false,
  });

  // Applied filters (drives the query)
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    priority: "",
    sender: "",
    has_attachments: false,
  });

  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reclassifyingId, setReclassifyingId] = useState<number | null>(null);

  // Build query params
  const queryParams: Record<string, string | number | boolean> = {
    limit: LIMIT,
    offset,
  };
  if (appliedFilters.priority) queryParams.priority = appliedFilters.priority;
  if (appliedFilters.sender) queryParams.sender = appliedFilters.sender;
  if (appliedFilters.has_attachments) queryParams.has_attachments = true;

  const { data, isLoading, isFetching } = useQuery<EmailsResponse>({
    queryKey: ["emails", appliedFilters, offset],
    queryFn: () => api.get("/emails", { params: queryParams }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const reclassifyMutation = useMutation({
    mutationFn: (id: number) => api.post(`/emails/${id}/reclassify`).then((r) => r.data),
    onMutate: (id) => setReclassifyingId(id),
    onSettled: () => {
      setReclassifyingId(null);
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  function handleSearch() {
    setOffset(0);
    setExpandedId(null);
    setAppliedFilters({ ...draftFilters });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  const items = data?.items ?? [];
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const hasPrev = offset > 0;
  const hasNext = items.length === LIMIT;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 overflow-y-auto space-y-4">

          {/* ── Filter Bar ── */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-end gap-3">
              {/* Priority */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Prioridade</label>
                <select
                  value={draftFilters.priority}
                  onChange={(e) =>
                    setDraftFilters((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[130px]"
                >
                  <option value="">Todos</option>
                  <option value="CRITICO">CRÍTICO</option>
                  <option value="ALTO">ALTO</option>
                  <option value="MEDIO">MÉDIO</option>
                  <option value="BAIXO">BAIXO</option>
                </select>
              </div>

              {/* Sender */}
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-xs text-slate-400 font-medium">Remetente</label>
                <input
                  type="text"
                  placeholder="email ou nome..."
                  value={draftFilters.sender}
                  onChange={(e) =>
                    setDraftFilters((f) => ({ ...f, sender: e.target.value }))
                  }
                  onKeyDown={handleKeyDown}
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Attachments */}
              <div className="flex items-center gap-2 pb-2">
                <input
                  id="has_attachments"
                  type="checkbox"
                  checked={draftFilters.has_attachments}
                  onChange={(e) =>
                    setDraftFilters((f) => ({ ...f, has_attachments: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-800"
                />
                <label
                  htmlFor="has_attachments"
                  className="text-sm text-slate-300 cursor-pointer select-none"
                >
                  Com anexos
                </label>
              </div>

              {/* Search button */}
              <button
                onClick={handleSearch}
                disabled={isFetching}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Search size={14} />
                Buscar
              </button>
            </div>
          </div>

          {/* ── Results count ── */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {isLoading ? (
                "Carregando..."
              ) : (
                <>
                  <span className="text-white font-medium">{items.length}</span>{" "}
                  resultado{items.length !== 1 ? "s" : ""} encontrado
                  {items.length !== 1 ? "s" : ""}
                  {isFetching && !isLoading && (
                    <span className="ml-2 text-slate-500">(atualizando...)</span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* ── Table ── */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Horário</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center">Ação Requerida</th>
                    <th className="px-4 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Loading skeleton */}
                  {isLoading &&
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

                  {/* Empty state */}
                  {!isLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <Inbox size={32} className="opacity-40" />
                          <p className="text-sm">Nenhum e-mail encontrado</p>
                          <p className="text-xs text-slate-600">
                            Tente ajustar os filtros de busca
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Data rows */}
                  {!isLoading &&
                    items.map((email) => (
                      <>
                        <tr
                          key={email.id}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                          onClick={() =>
                            setExpandedId(expandedId === email.id ? null : email.id)
                          }
                        >
                          {/* Priority */}
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                "px-2 py-0.5 rounded-md text-xs font-medium",
                                `priority-badge-${email.priority}`
                              )}
                            >
                              {PRIORITY_LABEL[email.priority] || email.priority}
                            </span>
                          </td>

                          {/* Sender */}
                          <td className="px-4 py-3">
                            <div className="text-white font-medium truncate max-w-[160px]">
                              {email.sender_name || email.sender_email}
                            </div>
                            <div className="text-slate-400 text-xs truncate max-w-[160px]">
                              {email.sender_email}
                            </div>
                          </td>

                          {/* Subject */}
                          <td className="px-4 py-3">
                            <div className="text-slate-200 truncate max-w-[220px]">
                              {email.subject}
                            </div>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                            {email.received_at
                              ? format(new Date(email.received_at), "dd/MM/yy HH:mm", {
                                  locale: ptBR,
                                })
                              : "—"}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-md truncate max-w-[120px] inline-block">
                              {email.category || "—"}
                            </span>
                          </td>

                          {/* Attachments */}
                          <td className="px-4 py-3 text-center">
                            {email.has_attachments ? (
                              <span className="flex items-center justify-center gap-1 text-blue-400">
                                <Paperclip size={12} />
                                <span className="text-xs">{email.attachment_count}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* WhatsApp */}
                          <td className="px-4 py-3 text-center">
                            {email.whatsapp_sent ? (
                              <MessageCircle size={14} className="text-green-400 mx-auto" />
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Action required */}
                          <td className="px-4 py-3 text-center">
                            {email.action_required ? (
                              <AlertCircle size={14} className="text-orange-400 mx-auto" />
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Expand chevron */}
                          <td className="px-4 py-3 text-center text-slate-400">
                            {expandedId === email.id ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {expandedId === email.id && (
                          <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">
                                    Resumo IA
                                  </p>
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                    {email.ai_summary ||
                                      email.body_preview ||
                                      "Sem resumo disponível."}
                                  </p>
                                  {email.is_spam && (
                                    <span className="mt-2 inline-block text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md">
                                      Marcado como spam
                                    </span>
                                  )}
                                </div>

                                {/* Reclassify button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    reclassifyMutation.mutate(email.id);
                                  }}
                                  disabled={reclassifyingId === email.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs rounded-lg transition-colors shrink-0"
                                >
                                  <RefreshCw
                                    size={12}
                                    className={
                                      reclassifyingId === email.id ? "animate-spin" : ""
                                    }
                                  />
                                  {reclassifyingId === email.id
                                    ? "Reclassificando..."
                                    : "Reclassificar"}
                                </button>
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

          {/* ── Pagination ── */}
          {!isLoading && items.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => {
                  setOffset((o) => Math.max(0, o - LIMIT));
                  setExpandedId(null);
                }}
                disabled={!hasPrev || isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm rounded-lg transition-colors"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>

              <span className="text-sm text-slate-400">
                Página{" "}
                <span className="text-white font-medium">{currentPage}</span>
              </span>

              <button
                onClick={() => {
                  setOffset((o) => o + LIMIT);
                  setExpandedId(null);
                }}
                disabled={!hasNext || isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm rounded-lg transition-colors"
              >
                Próxima
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
