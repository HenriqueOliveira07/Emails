"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { Filter } from "lucide-react";

const PRIORITIES = ["", "CRITICO", "ALTO", "MEDIO", "BAIXO"];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 50;

  const params: Record<string, string | number | boolean> = { limit: PAGE_SIZE, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments, offset],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    refetch();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <form
            onSubmit={applyFilters}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-4 items-end"
          >
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Filter size={14} />
              <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3 flex-1">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas as prioridades</option>
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Filtrar por remetente..."
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[200px]"
              />

              <select
                value={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Com/sem anexos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => { setPriority(""); setSender(""); setHasAttachments(""); setOffset(0); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Limpar
              </button>
            </div>
            <div className="text-xs text-slate-400 self-center ml-auto">
              {total} e-mail(s) encontrado(s)
            </div>
          </form>

          {isLoading ? (
            <div className="text-center text-slate-400 py-16">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={emails} />
          )}

          {total > PAGE_SIZE && (
            <div className="flex justify-center gap-3">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg"
              >
                Anterior
              </button>
              <span className="text-slate-400 text-sm self-center">
                {Math.floor(offset / PAGE_SIZE) + 1} / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm rounded-lg"
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
