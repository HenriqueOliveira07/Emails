"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { EmailTable } from "@/components/Dashboard/EmailTable";

const PRIORITIES = [
  { value: "", label: "Todas as prioridades" },
  { value: "CRITICO", label: "Crítico" },
  { value: "ALTO", label: "Alto" },
  { value: "MEDIO", label: "Médio" },
  { value: "BAIXO", label: "Baixo" },
];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [hasAttachments, setHasAttachments] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments],
    queryFn: () =>
      fetchEmails({
        ...(priority ? { priority } : {}),
        ...(sender ? { sender } : {}),
        ...(hasAttachments ? { has_attachments: true } : {}),
        limit: 100,
      }),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Filtrar por remetente..."
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2 flex-1 min-w-[200px]"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900"
              />
              Somente com anexos
            </label>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400 py-8">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={data?.items ?? []} />
          )}
        </main>
      </div>
    </div>
  );
}
