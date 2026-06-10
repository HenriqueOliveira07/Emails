"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, fetchEmailAttachments, EmailItem, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, Archive, File, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function FileIcon({ mime }: { mime: string }) {
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("document"))
    return <FileText size={14} className="text-red-400" />;
  if (mime.includes("image"))
    return <Image size={14} className="text-blue-400" />;
  if (mime.includes("zip") || mime.includes("compressed"))
    return <Archive size={14} className="text-yellow-400" />;
  return <File size={14} className="text-slate-400" />;
}

function humanSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let s = bytes;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}

function EmailAttachmentRow({ email }: { email: EmailItem }) {
  const [open, setOpen] = useState(false);

  const { data: attachments = [], isLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["attachments", email.id],
    queryFn: () => fetchEmailAttachments(email.id),
    enabled: open,
  });

  return (
    <>
      <tr
        className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer transition-colors"
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3">
          <div className="text-white text-sm font-medium truncate max-w-[180px]">
            {email.sender_name || email.sender_email}
          </div>
          <div className="text-slate-400 text-xs truncate max-w-[180px]">{email.sender_email}</div>
        </td>
        <td className="px-4 py-3 text-slate-200 text-sm truncate max-w-[280px]">
          {email.subject}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="flex items-center justify-center gap-1 text-blue-400">
            <Paperclip size={13} />
            <span className="text-sm font-medium">{email.attachment_count}</span>
          </span>
        </td>
        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
          {email.received_at
            ? format(new Date(email.received_at), "dd/MM/yy HH:mm", { locale: ptBR })
            : "—"}
        </td>
        <td className="px-4 py-3 text-center text-slate-400">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-900/40">
          <td colSpan={5} className="px-6 py-3">
            {isLoading && (
              <p className="text-xs text-slate-400">Carregando anexos...</p>
            )}
            {!isLoading && attachments.length === 0 && (
              <p className="text-xs text-slate-400">Nenhum anexo encontrado</p>
            )}
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-2.5">
                  <FileIcon mime={att.file_type || ""} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{att.filename}</p>
                    <p className="text-xs text-slate-500 truncate">{att.original_filename}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                    <span>{humanSize(att.file_size)}</span>
                    <span className="text-slate-600 font-mono text-xs truncate max-w-[200px]">
                      {att.file_type}
                    </span>
                    {att.has_pdf_text && (
                      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">PDF</span>
                    )}
                    {att.has_ocr && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">OCR</span>
                    )}
                    {att.has_ai_summary && (
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">IA</span>
                    )}
                    {att.saved_at && (
                      <span>{format(new Date(att.saved_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["emails-with-attachments"],
    queryFn: () => fetchEmails({ has_attachments: true, limit: 100 }),
    refetchInterval: 60_000,
  });

  const emails: EmailItem[] = data?.items ?? [];
  const totalAttachments = emails.reduce((s, e) => s + (e.attachment_count || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Paperclip size={20} className="text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{totalAttachments}</p>
                <p className="text-xs text-slate-400">Total de anexos salvos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <FileText size={20} className="text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{emails.length}</p>
                <p className="text-xs text-slate-400">E-mails com anexos</p>
              </div>
            </div>
          </div>

          {/* Organized path hint */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400">
              <span className="text-slate-300 font-medium">Organização no servidor:</span>{" "}
              <code className="font-mono text-blue-400">/app/attachments/YYYY/MM/DD/Remetente/arquivo.ext</code>
            </p>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">E-mails com Anexos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-center">Anexos</th>
                    <th className="px-4 py-3 text-left">Recebido</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && emails.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Nenhum e-mail com anexos encontrado
                      </td>
                    </tr>
                  )}
                  {emails.map((email) => (
                    <EmailAttachmentRow key={email.id} email={email} />
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
