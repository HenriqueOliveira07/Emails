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
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const params: Record<string, string | number | boolean> = { limit: LIMIT, offset };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments, offset],
    queryFn: () => fetchEmails(params),
  });

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
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Remetente</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => { setSender(e.target.value); setOffset(0); }}
                  placeholder="Buscar remetente..."
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg pl-8 pr-3 py-2 w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => { setHasAttachments(e.target.value); setOffset(0); }}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
            >
              <Filter size={12} />
              Filtrar
            </button>
          </div>

          {/* Resultados */}
          {isLoading ? (
            <div className="text-center text-slate-400 py-12">Carregando e-mails...</div>
          ) : (
            <>
              <p className="text-xs text-slate-400">{data?.items?.length ?? 0} e-mail(s) exibidos</p>
              <EmailTable emails={data?.items ?? []} />
              <div className="flex justify-between items-center pt-2">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-400">Página {Math.floor(offset / LIMIT) + 1}</span>
                <button
                  disabled={(data?.items?.length ?? 0) < LIMIT}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
                >
                  Próxima
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
