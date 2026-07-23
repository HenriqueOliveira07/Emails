"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails } from "@/lib/api";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["emails-with-attachments"],
    queryFn: () => fetchEmails({ limit: 100, has_attachments: true }),
    refetchInterval: 30_000,
  });

  const totalAttachments = (data?.items ?? []).reduce(
    (sum, e) => sum + (e.attachment_count || 0),
    0
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <p className="text-sm text-slate-400">
            {data?.items.length ?? 0} e-mails com anexos · {totalAttachments} arquivos salvos em{" "}
            <code className="text-slate-300">/Emails_Importantes/AAAA/MM/DD/Remetente/</code>
          </p>
          {isLoading ? (
            <div className="text-center text-slate-400 py-8">Carregando anexos...</div>
          ) : (
            <EmailTable emails={data?.items ?? []} />
          )}
        </main>
      </div>
    </div>
  );
}
