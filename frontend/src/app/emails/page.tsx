"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { useState } from "react";
import { Search } from "lucide-react";

const PRIORITIES = [
  { value: "", label: "Todos" },
  { value: "CRITICO", label: "Crítico" },
  { value: "ALTO", label: "Alto" },
  { value: "MEDIO", label: "Médio" },
  { value: "BAIXO", label: "Baixo" },
];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState<string>("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments],
    queryFn: () => {
      const params: Record<string, string | number | boolean> = {};
      if (priority) params.priority = priority;
      if (sender) params.sender = sender;
      if (hasAttachments !== "") params.has_attachments = hasAttachments === "true";
      return fetchEmails(params);
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Priority filter */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Prioridade</label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPriority(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        priority === value
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sender filter */}
              <div className="space-y-1 flex-1 min-w-40">
                <label className="text-xs text-slate-400 font-medium">Remetente</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Attachments filter */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Anexos</label>
                <select
                  value={hasAttachments}
                  onChange={(e) => setHasAttachments(e.target.value)}
                  className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Com anexos</option>
                  <option value="false">Sem anexos</option>
                </select>
              </div>

              <button
                onClick={() => refetch()}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
              >
                Atualizar
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{data?.items?.length ?? 0} e-mails exibidos</span>
          </div>

          {isLoading ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl py-12 text-center text-slate-400">
              Carregando e-mails...
            </div>
          ) : (
            <EmailTable emails={data?.items ?? []} />
          )}
        </main>
      </div>
    </div>
  );
}
