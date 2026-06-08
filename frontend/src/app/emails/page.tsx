"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { Filter, Search } from "lucide-react";

const PRIORITIES = ["Todos", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [senderFilter, setSenderFilter] = useState("");
  const [hasAttachments, setHasAttachments] = useState<boolean | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const params: Record<string, string | number | boolean> = { limit: LIMIT, offset };
  if (priority && priority !== "Todos") params.priority = priority;
  if (senderFilter) params.sender = senderFilter;
  if (hasAttachments !== undefined) params.has_attachments = hasAttachments;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["emails", priority, senderFilter, hasAttachments, offset],
    queryFn: () => fetchEmails(params),
    staleTime: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setOffset(0); }}
                className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p === "Todos" ? "" : p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Remetente</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={senderFilter}
                  onChange={(e) => { setSenderFilter(e.target.value); setOffset(0); }}
                  placeholder="Filtrar por e-mail..."
                  className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg pl-8 pr-3 py-2 w-56 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments === undefined ? "" : String(hasAttachments)}
                onChange={(e) => {
                  setHasAttachments(e.target.value === "" ? undefined : e.target.value === "true");
                  setOffset(0);
                }}
                className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>

            <div className="ml-auto flex items-end">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Filter size={12} />
                {isFetching ? "Carregando..." : `${total} e-mails`}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400 py-16">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={emails} />
          )}

          {/* Paginação */}
          {total > LIMIT && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-400">
                {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}
              </span>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
              >
                Próximo
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
