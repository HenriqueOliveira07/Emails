"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails } from "@/lib/api";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { clsx } from "clsx";

const PRIORITIES = [
  { value: "", label: "Todas" },
  { value: "CRITICO", label: "Crítico" },
  { value: "ALTO", label: "Alto" },
  { value: "MEDIO", label: "Médio" },
  { value: "BAIXO", label: "Baixo" },
];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["emails", priority, sender],
    queryFn: () =>
      fetchEmails({
        limit: 100,
        ...(priority ? { priority } : {}),
        ...(sender ? { sender } : {}),
      }),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="E-mails" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    priority === p.value
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Filtrar por remetente..."
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
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
