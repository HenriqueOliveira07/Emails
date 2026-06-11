"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, fetchEmailAttachments, EmailItem, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, ChevronDown, ChevronUp, FileText, Image, Archive } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_LABELS: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

function fileIcon(type: string) {
  if (type.includes("pdf") || type.includes("word") || type.includes("text"))
    return <FileText size={12} className="text-blue-400" />;
  if (type.includes("image"))
    return <Image size={12} className="text-green-400" />;
  return <Archive size={12} className="text-yellow-400" />;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function AttachmentRow({ email }: { email: EmailItem }) {
  const [open, setOpen] = useState(false);

  const { data: attachments, isLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["attachments", email.id],
    queryFn: () => fetchEmailAttachments(email.id),
    enabled: open,
  });

  return (
    <>
      <tr
        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3">
          <span
            className={clsx(
              "px-2 py-0.5 rounded-md text-xs font-medium",
              `priority-badge-${email.priority}`
            )}
          >
            {PRIORITY_LABELS[email.priority] || email.priority}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="text-white font-medium truncate max-w-[200px]">
            {email.sender_name || email.sender_email}
          </div>
          <div className="text-slate-400 text-xs truncate max-w-[200px]">{email.sender_email}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-slate-200 truncate max-w-[280px]">{email.subject}</div>
          <div className="text-slate-500 text-xs">{email.category}</div>
        </td>
        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
          {email.received_at
            ? format(new Date(email.received_at), "dd/MM/yy HH:mm", { locale: ptBR })
            : "—"}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="flex items-center justify-center gap-1 text-blue-400">
            <Paperclip size={12} />
            <span className="text-xs font-medium">{email.attachment_count}</span>
          </span>
        </td>
        <td className="px-4 py-3 text-center text-slate-400">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-900/60">
          <td colSpan={6} className="px-6 py-4">
            {isLoading ? (
              <p className="text-xs text-slate-400">Carregando anexos...</p>
            ) : (
              <div className="space-y-2">
                {attachments?.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                  >
                    {fileIcon(att.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{att.original_filename}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">
                          {att.file_type || "tipo desconhecido"}
                        </span>
                        {att.file_size && (
                          <span className="text-xs text-slate-500">{humanSize(att.file_size)}</span>
                        )}
                        {att.saved_at && (
                          <span className="text-xs text-slate-500">
                            Salvo em:{" "}
                            {format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {att.has_ocr && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs rounded">
                          OCR
                        </span>
                      )}
                      {att.has_pdf_text && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs rounded">
                          PDF
                        </span>
                      )}
                      {att.has_ai_summary && (
                        <span className="px-1.5 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 text-xs rounded">
                          IA
                        </span>
                      )}
                      {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs rounded">
                          NF/Boleto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery({
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
        <main className="flex-1 p-6 overflow-y-auto space-y-6">

          {/* Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "E-mails com anexos", value: emails.length, color: "text-white" },
              { label: "Total de arquivos", value: totalAttachments, color: "text-blue-400" },
              {
                label: "Críticos com anexos",
                value: emails.filter((e) => e.priority === "CRITICO").length,
                color: "text-red-400",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4"
              >
                <p className={clsx("text-2xl font-bold", color)}>{value}</p>
                <p className="text-sm text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            {isLoading ? "Carregando..." : `${emails.length} e-mail(s) com anexos — clique para expandir`}
          </p>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-center">Arquivos</th>
                    <th className="px-4 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Nenhum e-mail com anexos encontrado
                      </td>
                    </tr>
                  )}
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {emails.map((email) => (
                    <AttachmentRow key={email.id} email={email} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
