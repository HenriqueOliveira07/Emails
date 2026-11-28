"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { PageShell, Card, inputCls, Empty } from "@/components/Layout/PageShell";

const PRIORITIES = [
  ["", "Todas"],
  ["CRITICO", "Crítico"],
  ["ALTO", "Alto"],
  ["MEDIO", "Médio"],
  ["BAIXO", "Baixo"],
];

export default function EmailsPage() {
  const [priority, setPriority] = useState("");
  const [sender, setSender] = useState("");
  const [onlyAttachments, setOnlyAttachments] = useState(false);

  const params: Record<string, string | number | boolean> = { limit: 200 };
  if (priority) params.priority = priority;
  if (sender) params.sender = sender;
  if (onlyAttachments) params.has_attachments = true;

  const { data, isLoading } = useQuery<{ items: EmailItem[] }>({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(params),
    refetchInterval: 30_000,
  });

  return (
    <PageShell title="E-mails">
      <Card
        title="Filtros"
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              className={inputCls}
              placeholder="Remetente contém…"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={onlyAttachments} onChange={(e) => setOnlyAttachments(e.target.checked)} />
              Com anexos
            </label>
          </div>
        }
      >
        <div />
      </Card>
      {isLoading ? (
        <Empty text="Carregando…" />
      ) : data?.items?.length ? (
        <EmailTable emails={data.items} />
      ) : (
        <Card><Empty text="Nenhum e-mail encontrado com esses filtros." /></Card>
      )}
    </PageShell>
  );
}
