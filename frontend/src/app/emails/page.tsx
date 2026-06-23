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

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments],
    queryFn: () =>
      fetchEmails({
        ...(priority ? { priority } : {}),
        ...(sender ? { sender } : {}),
        ...(hasAttachments !== "" ? { has_attachments: hasAttachments === "true" } : {}),
        limit: 100,
      }),
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
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Filtros</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="email@empresa.com"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg pl-7 pr-3 py-1.5 w-48 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Anexos</label>
              <select
                value={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com anexos</option>
                <option value="false">Sem anexos</option>
              </select>
            </div>

            <div className="ml-auto text-xs text-slate-500">
              {emails.length} resultado(s)
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400 py-12">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={emails} />
          )}
        </main>
      </div>
    </div>
  );
}
