"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { Search, Filter } from "lucide-react";

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");

  const params: Record<string, string | number | boolean> = { limit: 100 };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                <option value="CRITICO">Crítico</option>
                <option value="ALTO">Alto</option>
                <option value="MEDIO">Médio</option>
                <option value="BAIXO">Baixo</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Remetente</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="Filtrar por remetente..."
                  className="bg-slate-700 border border-slate-600 text-white rounded-lg pl-8 pr-3 py-2 text-sm w-56"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm ml-auto">
              <Filter size={14} />
              <span>{emails.length} resultado(s)</span>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center text-slate-400">
              Carregando e-mails...
            </div>
          ) : (
            <EmailTable emails={emails} />
          )}
        </main>
      </div>
    </div>
  );
}
