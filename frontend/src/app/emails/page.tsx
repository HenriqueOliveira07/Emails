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
  const [hasAttachments, setHasAttachments] = useState("");

  const params: Record<string, string | number | boolean> = { limit: 100 };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (hasAttachments === "yes") params.has_attachments = true;
  if (hasAttachments === "no") params.has_attachments = false;

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender, hasAttachments],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={16} className="text-slate-400" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas prioridades</option>
              {PRIORITIES.filter(Boolean).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={hasAttachments}
              onChange={(e) => setHasAttachments(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Com/sem anexos</option>
              <option value="yes">Com anexos</option>
              <option value="no">Sem anexos</option>
            </select>
            <input
              type="text"
              placeholder="Filtrar por remetente..."
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 w-56"
            />
            <span className="text-xs text-slate-500 ml-auto">
              {data?.items?.length ?? 0} e-mail(s)
            </span>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400 py-12">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={(data?.items ?? []) as EmailItem[]} />
          )}
        </main>
      </div>
    </div>
  );
}
