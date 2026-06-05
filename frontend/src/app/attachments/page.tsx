"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, fetchEmailAttachments, AttachmentItem, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, FileText, Image, Archive, File,
  ChevronDown, ChevronUp, Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const FILE_ICONS: Record<string, React.ReactNode> = {
  "application/pdf": <FileText size={16} className="text-red-400" />,
  "image/jpeg": <Image size={16} className="text-blue-400" />,
  "image/png": <Image size={16} className="text-blue-400" />,
  "application/zip": <Archive size={16} className="text-yellow-400" />,
};

const getIcon = (fileType: string) =>
  FILE_ICONS[fileType] ?? <File size={16} className="text-slate-400" />;

const humanSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function AttachmentRow({ emailId }: { emailId: number }) {
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", emailId],
    queryFn: () => fetchEmailAttachments(emailId),
  });

  if (isLoading) return <div className="px-6 py-2 text-xs text-slate-400">Carregando anexos...</div>;
  if (attachments.length === 0) return <div className="px-6 py-2 text-xs text-slate-400">Sem anexos</div>;

  return (
    <div className="px-6 py-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {attachments.map((att: AttachmentItem) => (
        <div key={att.id} className="bg-slate-800 rounded-lg p-3 flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">{getIcon(att.file_type)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-medium truncate">{att.original_filename}</p>
            <p className="text-xs text-slate-400 mt-0.5">{humanSize(att.file_size)}</p>
            <div className="flex gap-1 mt-1 flex-wrap">
              {att.has_pdf_text && (
                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">PDF</span>
              )}
              {att.has_ocr && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">OCR</span>
              )}
              {att.has_ai_summary && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">IA</span>
              )}
              {Object.keys(att.invoice_data || {}).length > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">NF/Boleto</span>
              )}
            </div>
            {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
              <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                {att.invoice_data.valor && <p>Valor: {String(att.invoice_data.valor)}</p>}
                {att.invoice_data.vencimento && <p>Vencimento: {String(att.invoice_data.vencimento)}</p>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AttachmentsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["emails-with-attachments"],
    queryFn: () => fetchEmails({ has_attachments: true, limit: 100 }),
    refetchInterval: 60_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const totalAttachments = emails.reduce((acc, e) => acc + (e.attachment_count || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Paperclip size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{totalAttachments}</p>
                <p className="text-sm text-slate-400">Total de Anexos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Download size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{emails.length}</p>
                <p className="text-sm text-slate-400">E-mails com Anexos</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-400">
            Caminho de armazenamento: <span className="text-blue-400 font-mono">/app/attachments/YYYY/MM/DD/Remetente/</span>
          </div>

          {/* Email List with Attachments */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">E-mails com Anexos</h3>
            </div>

            {isLoading && (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
            )}
            {!isLoading && emails.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">Nenhum anexo salvo</div>
            )}

            <div className="divide-y divide-slate-700/50">
              {emails.map((email) => (
                <div key={email.id}>
                  <div
                    className="px-5 py-3 flex items-center gap-3 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                  >
                    <div className={clsx("shrink-0 text-xs px-2 py-0.5 rounded font-medium", `priority-badge-${email.priority}`)}>
                      {email.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{email.subject}</p>
                      <p className="text-xs text-slate-400 truncate">{email.sender_name || email.sender_email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-blue-400 text-xs">
                        <Paperclip size={12} />
                        {email.attachment_count}
                      </span>
                      {email.received_at && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(email.received_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 shrink-0">
                      {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {expanded === email.id && (
                    <div className="bg-slate-900/40 border-t border-slate-700/50">
                      <AttachmentRow emailId={email.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
