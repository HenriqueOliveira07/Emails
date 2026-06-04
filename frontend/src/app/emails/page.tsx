"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { Search, Filter } from "lucide-react";

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const params: Record<string, string | number | boolean> = { limit, offset: page * limit };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading } = useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Prioridade</label>
              <select
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(0); }}
              >
                <option value="">Todas</option>
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Remetente</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="email@empresa.com"
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                  value={sender}
                  onChange={(e) => { setSender(e.target.value); setPage(0); }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-medium">Anexos</label>
              <select
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value); setPage(0); }}
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
              <Filter size={12} />
              <span>{data?.items?.length ?? 0} e-mails</span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400 py-12">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={data?.items ?? []} />
          )}

          {/* Pagination */}
          {data && (
            <div className="flex justify-between items-center text-sm text-slate-400">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg transition-colors text-slate-200"
              >
                Anterior
              </button>
              <span>Página {page + 1}</span>
              <button
                disabled={(data.items?.length ?? 0) < limit}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg transition-colors text-slate-200"
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
