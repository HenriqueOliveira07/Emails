"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, RefreshCw, FileText, Image, Archive } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

function AttachmentIcon({ count }: { count: number }) {
  if (count >= 3) return <Archive size={14} className="text-purple-400" />;
  if (count >= 2) return <FileText size={14} className="text-blue-400" />;
  return <Image size={14} className="text-cyan-400" />;
}

export default function AttachmentsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["emails-with-attachments"],
    queryFn: () => fetchEmails({ has_attachments: true, limit: 200 }),
    refetchInterval: 60_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const totalAttachments = emails.reduce((sum, e) => sum + (e.attachment_count || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400">E-mails com Anexos</p>
              <p className="text-2xl font-bold text-white mt-1">{emails.length}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400">Total de Arquivos</p>
              <p className="text-2xl font-bold text-white mt-1">{totalAttachments}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 col-span-2 lg:col-span-1">
              <p className="text-xs text-slate-400">Diretório Base</p>
              <p className="text-sm font-mono text-slate-300 mt-1 truncate">/app/attachments/</p>
              <p className="text-xs text-slate-500 mt-0.5">organizado por YYYY/MM/DD/Remetente</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `E-mails com anexos (${emails.length})`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivos</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Caminho</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Nenhum e-mail com anexos encontrado
                      </td>
                    </tr>
                  )}
                  {emails.map((email) => {
                    const dt = email.received_at ? new Date(email.received_at) : null;
                    const pathSuffix = dt
                      ? `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${email.sender_name || email.sender_email.split("@")[0]}`
                      : "—";
                    return (
                      <tr key={email.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <AttachmentIcon count={email.attachment_count} />
                            <span className="text-xs">{email.attachment_count} arquivo(s)</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white text-xs truncate max-w-[130px]">
                            {email.sender_name || email.sender_email}
                          </div>
                          <div className="text-slate-500 text-xs truncate max-w-[130px]">{email.sender_email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 text-xs truncate max-w-[200px]">{email.subject}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", `priority-badge-${email.priority}`)}>
                            {PRIORITY_LABEL[email.priority] || email.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {dt ? format(dt, "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Paperclip size={10} />
                            <span className="text-xs font-mono truncate max-w-[200px]">{pathSuffix}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
