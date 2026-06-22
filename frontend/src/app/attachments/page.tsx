"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, fetchEmailAttachments, EmailItem, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, FileText, Image, FileSpreadsheet, Archive,
  FileCode, File, Search,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FILE_ICONS: Record<string, ReactNode> = {
  pdf: <FileText size={16} className="text-red-400" />,
  xlsx: <FileSpreadsheet size={16} className="text-green-400" />,
  xls: <FileSpreadsheet size={16} className="text-green-400" />,
  docx: <FileText size={16} className="text-blue-400" />,
  doc: <FileText size={16} className="text-blue-400" />,
  jpg: <Image size={16} className="text-yellow-400" />,
  jpeg: <Image size={16} className="text-yellow-400" />,
  png: <Image size={16} className="text-yellow-400" />,
  zip: <Archive size={16} className="text-purple-400" />,
  xml: <FileCode size={16} className="text-orange-400" />,
  csv: <FileSpreadsheet size={16} className="text-teal-400" />,
};

function FileIcon({ filename }: { filename: string }): ReactNode {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? <File size={16} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  for (const unit of units) {
    if (size < 1024) return `${size.toFixed(1)} ${unit}`;
    size /= 1024;
  }
  return `${size.toFixed(1)} TB`;
}

function EmailAttachmentsRow({ email }: { email: EmailItem }) {
  const { data: attachments } = useQuery({
    queryKey: ["attachments", email.id],
    queryFn: () => fetchEmailAttachments(email.id),
    enabled: email.has_attachments,
  });

  if (!email.has_attachments || !attachments?.length) return null;

  return (
    <>
      {attachments.map((att: AttachmentItem) => (
        <div
          key={att.id}
          className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
        >
          <FileIcon filename={att.filename} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">{att.original_filename}</p>
            <p className="text-xs text-slate-500 truncate">{att.file_path}</p>
          </div>
          <div className="text-xs text-slate-400 shrink-0">{humanSize(att.file_size)}</div>
          <div className="text-xs text-slate-500 shrink-0 hidden lg:block">
            {email.sender_name || email.sender_email}
          </div>
          <div className="text-xs text-slate-500 shrink-0 hidden lg:block">
            {att.saved_at
              ? format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
              : "—"}
          </div>
          <div className="flex gap-1">
            {att.has_ocr && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">OCR</span>
            )}
            {att.has_pdf_text && (
              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">PDF</span>
            )}
            {Object.keys(att.invoice_data ?? {}).length > 0 && (
              <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">NF</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export default function AttachmentsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["emails-with-attachments"],
    queryFn: () => fetchEmails({ has_attachments: true, limit: 100 }),
    refetchInterval: 60_000,
  });

  const emails: EmailItem[] = (data?.items ?? []).filter(
    (e: EmailItem) =>
      !search ||
      e.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.sender_email?.toLowerCase().includes(search.toLowerCase()) ||
      e.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAttachments = emails.reduce((sum, e) => sum + (e.attachment_count ?? 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Paperclip size={18} className="text-blue-400" />
              <div>
                <p className="text-xl font-bold text-white">{totalAttachments}</p>
                <p className="text-xs text-slate-400">Total de anexos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <FileText size={18} className="text-purple-400" />
              <div>
                <p className="text-xl font-bold text-white">{emails.length}</p>
                <p className="text-xs text-slate-400">E-mails com anexos</p>
              </div>
            </div>
          </div>

          {/* Filtro */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por remetente ou assunto..."
                className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Lista de anexos */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 text-xs text-slate-400 uppercase tracking-wide hidden lg:grid">
              <span>Tipo</span>
              <span>Arquivo</span>
              <span>Tamanho</span>
              <span>Remetente</span>
              <span>Data</span>
              <span>Tags</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando...</div>
            ) : emails.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                Nenhum e-mail com anexos encontrado
              </div>
            ) : (
              emails.map((email) => (
                <EmailAttachmentsRow key={email.id} email={email} />
              ))
            )}
          </div>

          <p className="text-xs text-slate-500 text-center">
            Organização em disco: /Emails_Importantes/AAAA/MM/DD/Remetente/
          </p>
        </main>
      </div>
    </div>
  );
}
