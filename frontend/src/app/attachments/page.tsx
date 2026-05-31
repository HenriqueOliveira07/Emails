"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, fetchEmailAttachments, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, File, Archive, Database, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const EXT_ICON: Record<string, React.ElementType> = {
  pdf: FileText,
  xlsx: Database, xls: Database, csv: Database,
  docx: FileText, doc: FileText,
  jpg: Image, jpeg: Image, png: Image, gif: Image,
  zip: Archive,
};

function getIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const Icon = EXT_ICON[ext] ?? File;
  return <Icon size={14} />;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function EmailAttachmentList({ emailId }: { emailId: number }) {
  const { data = [] } = useQuery<AttachmentItem[]>({
    queryKey: ["attachments", emailId],
    queryFn: () => fetchEmailAttachments(emailId),
    staleTime: 60_000,
  });

  if (data.length === 0) return null;

  return (
    <div className="px-6 pb-4 pt-2 bg-slate-900/50 space-y-2">
      {data.map((att) => (
        <div key={att.id} className="flex items-center gap-3 py-1.5 px-3 bg-slate-800 rounded-lg">
          <span className="text-blue-400">{getIcon(att.filename)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-200 truncate">{att.original_filename}</p>
            <p className="text-xs text-slate-500">{att.file_type || "—"}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-300">{humanSize(att.file_size ?? 0)}</p>
            {att.saved_at && (
              <p className="text-xs text-slate-500">
                {format(new Date(att.saved_at), "dd/MM HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {att.has_pdf_text && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">PDF</span>
            )}
            {att.has_ocr && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">OCR</span>
            )}
            {att.has_ai_summary && (
              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">IA</span>
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
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const emails = data?.items ?? [];
  const totalAttachments = emails.reduce((sum, e) => sum + (e.attachment_count ?? 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">{totalAttachments}</p>
              <p className="text-xs text-slate-400 mt-1">Total de anexos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-300">{emails.length}</p>
              <p className="text-xs text-slate-400 mt-1">E-mails com anexos</p>
            </div>
          </div>

          {/* List */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
              <Paperclip size={14} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${emails.length} e-mails com anexos`}
              </h3>
            </div>
            <div className="divide-y divide-slate-700/50">
              {emails.length === 0 && !isLoading && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  Nenhum e-mail com anexos encontrado
                </div>
              )}
              {emails.map((email) => (
                <>
                  <div
                    key={email.id}
                    className="px-5 py-3 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={clsx("text-xs px-1.5 py-0.5 rounded border", `priority-badge-${email.priority}`)}>
                          {email.priority}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 truncate">{email.subject}</p>
                          <p className="text-xs text-slate-500">{email.sender_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1 text-blue-400 text-xs">
                          <Paperclip size={11} />
                          {email.attachment_count}
                        </span>
                        {email.received_at && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(email.received_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {expanded === email.id
                          ? <ChevronUp size={13} className="text-slate-400" />
                          : <ChevronDown size={13} className="text-slate-400" />
                        }
                      </div>
                    </div>
                  </div>
                  {expanded === email.id && (
                    <EmailAttachmentList key={`att-${email.id}`} emailId={email.id} />
                  )}
                </>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
