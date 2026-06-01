"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchEmails, EmailItem, reclassifyEmail } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { Search, Filter, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

const PRIORITY_OPTS = [
  { label: "Todos", value: "" },
  { label: "CRÍTICO", value: "CRITICO" },
  { label: "ALTO", value: "ALTO" },
  { label: "MÉDIO", value: "MEDIO" },
  { label: "BAIXO", value: "BAIXO" },
];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<boolean | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== undefined) params.has_attachments = hasAttachments;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 60_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PRIORITY_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Remetente</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={sender}
                  onChange={(e) => { setSender(e.target.value); setOffset(0); }}
                  placeholder="Buscar remetente..."
                  className="bg-slate-700 border border-slate-600 text-sm text-white rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments === undefined ? "" : hasAttachments ? "yes" : "no"}
                onChange={(e) => {
                  setHasAttachments(e.target.value === "" ? undefined : e.target.value === "yes");
                  setOffset(0);
                }}
                className="bg-slate-700 border border-slate-600 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="yes">Com anexos</option>
                <option value="no">Sem anexos</option>
              </select>
            </div>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>

            <span className="ml-auto text-sm text-slate-400 self-center">
              {total} e-mail(s) encontrado(s)
            </span>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center text-slate-400 py-12">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={emails} />
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-400">
                {Math.floor(offset / limit) + 1} de {Math.ceil(total / limit)}
              </span>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
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
