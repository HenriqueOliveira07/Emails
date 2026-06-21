"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Paperclip,
  ChevronDown,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  FileImage,
  Archive,
  File,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "") + "/api";

interface Attachment {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  saved_at: string;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: unknown;
}

interface Email {
  id: number;
  sender: string;
  subject: string;
  received_at: string;
  attachment_count: number;
}

interface RecentEmailsResponse {
  emails: Email[];
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileTypeMeta(fileType: string) {
  const type = (fileType || "").toLowerCase();
  if (type.includes("pdf"))
    return { icon: FileText, label: "PDF", badge: "bg-red-900 text-red-300 border-red-700", iconClass: "text-red-400" };
  if (type.includes("sheet") || type.includes("excel") || type.includes("xls") || type.includes("csv"))
    return { icon: FileSpreadsheet, label: "Excel", badge: "bg-green-900 text-green-300 border-green-700", iconClass: "text-green-400" };
  if (type.includes("word") || type.includes("doc"))
    return { icon: FileText, label: "Word", badge: "bg-blue-900 text-blue-300 border-blue-700", iconClass: "text-blue-400" };
  if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("7z"))
    return { icon: Archive, label: "ZIP", badge: "bg-slate-700 text-slate-300 border-slate-600", iconClass: "text-slate-400" };
  if (
    type.includes("image") ||
    type.includes("png") ||
    type.includes("jpg") ||
    type.includes("jpeg") ||
    type.includes("gif") ||
    type.includes("svg")
  )
    return { icon: FileImage, label: "Imagem", badge: "bg-purple-900 text-purple-300 border-purple-700", iconClass: "text-purple-400" };
  return { icon: File, label: fileType || "Arquivo", badge: "bg-slate-700 text-slate-300 border-slate-600", iconClass: "text-slate-400" };
}

function AttachmentSubRow({ attachment }: { attachment: Attachment }) {
  const meta = getFileTypeMeta(attachment.file_type);
  const Icon = meta.icon;
  const displayName = attachment.original_filename || attachment.filename;
  const shortPath =
    attachment.file_path && attachment.file_path.length > 42
      ? "..." + attachment.file_path.slice(-39)
      : attachment.file_path;

  return (
    <tr className="border-b border-slate-700/40 hover:bg-slate-800/40 transition-colors">
      <td className="pl-8 pr-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon size={14} className={meta.iconClass} />
          <span className="text-slate-200 text-sm" title={displayName}>
            {displayName}
          </span>
        </div>
        {shortPath && (
          <p className="text-slate-600 text-xs mt-0.5 ml-5" title={attachment.file_path}>
            {shortPath}
          </p>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className={clsx("text-xs font-medium px-2 py-0.5 rounded border", meta.badge)}>
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-slate-300 text-sm whitespace-nowrap">
        {formatFileSize(attachment.file_size)}
      </td>
      <td className="px-4 py-2.5 text-slate-300 text-sm whitespace-nowrap">
        {attachment.saved_at
          ? format(new Date(attachment.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
          : "—"}
      </td>
      <td className="px-4 py-2.5 text-center">
        {attachment.has_ocr ? (
          <CheckCircle size={14} className="text-green-400 mx-auto" />
        ) : (
          <XCircle size={14} className="text-slate-600 mx-auto" />
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        {attachment.has_pdf_text ? (
          <CheckCircle size={14} className="text-green-400 mx-auto" />
        ) : (
          <XCircle size={14} className="text-slate-600 mx-auto" />
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        {attachment.has_ai_summary ? (
          <CheckCircle size={14} className="text-green-400 mx-auto" />
        ) : (
          <XCircle size={14} className="text-slate-600 mx-auto" />
        )}
      </td>
    </tr>
  );
}

function EmailRow({ email }: { email: Email }) {
  const [expanded, setExpanded] = useState(false);

  const { data: attachments, isLoading } = useQuery<Attachment[]>({
    queryKey: ["attachments", email.id],
    queryFn: async () => {
      const { data } = await axios.get<Attachment[]>(`${API_BASE}/emails/${email.id}/attachments`);
      return data;
    },
    enabled: expanded,
    staleTime: 60_000,
  });

  return (
    <>
      <tr className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
        <td className="px-4 py-3 text-slate-400 text-sm font-mono">#{email.id}</td>
        <td className="px-4 py-3 text-slate-200 text-sm max-w-[180px]">
          <span className="truncate block" title={email.sender}>
            {email.sender}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-200 text-sm max-w-[280px]">
          <span className="truncate block" title={email.subject}>
            {email.subject}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 border border-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <Paperclip size={11} />
            {email.attachment_count}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-300 text-sm whitespace-nowrap">
          {email.received_at
            ? format(new Date(email.received_at), "dd/MM/yy HH:mm", { locale: ptBR })
            : "—"}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded border border-slate-600 transition-colors"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Ver Anexos
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0 bg-slate-900/50">
            <div className="border-t border-slate-700/50">
              {isLoading ? (
                <p className="text-slate-400 text-sm px-8 py-4">Carregando anexos...</p>
              ) : !attachments || attachments.length === 0 ? (
                <p className="text-slate-500 text-sm px-8 py-4">Nenhum anexo encontrado.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/40">
                      <th className="pl-8 pr-4 py-2 text-left text-xs text-slate-500 font-semibold">Arquivo</th>
                      <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold">Tamanho</th>
                      <th className="px-4 py-2 text-left text-xs text-slate-500 font-semibold">Salvo em</th>
                      <th className="px-4 py-2 text-center text-xs text-slate-500 font-semibold">OCR</th>
                      <th className="px-4 py-2 text-center text-xs text-slate-500 font-semibold">PDF Text</th>
                      <th className="px-4 py-2 text-center text-xs text-slate-500 font-semibold">Resumo IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((att) => (
                      <AttachmentSubRow key={att.id} attachment={att} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AttachmentsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery<RecentEmailsResponse>({
    queryKey: ["emails-with-attachments"],
    queryFn: async () => {
      const { data } = await axios.get<RecentEmailsResponse>(
        `${API_BASE}/dashboard/recent-emails?limit=200`
      );
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const emailsWithAttachments: Email[] = (data?.emails || []).filter(
    (e: Email) => e.attachment_count > 0
  );

  const filtered = emailsWithAttachments.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.sender || "").toLowerCase().includes(q) ||
      (e.subject || "").toLowerCase().includes(q) ||
      String(e.id).includes(q)
    );
  });

  const totalAttachments = emailsWithAttachments.reduce(
    (sum, e) => sum + (e.attachment_count || 0),
    0
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">E-mails com Anexos</p>
              <p className="text-2xl font-bold text-white mt-1">
                {isLoading ? "—" : emailsWithAttachments.length}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Total de Anexos</p>
              <p className="text-2xl font-bold text-white mt-1">
                {isLoading ? "—" : totalAttachments}
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Resultados Visíveis</p>
              <p className="text-2xl font-bold text-white mt-1">
                {isLoading ? "—" : filtered.length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por remetente ou assunto..."
                className="w-full bg-slate-900 border border-slate-600 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Remetente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Assunto
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Qtd Anexos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Horário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                      Carregando e-mails...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-red-400 text-sm">
                      Erro ao carregar dados. Verifique a conexão com a API.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-500 text-sm">
                      {search.trim()
                        ? "Nenhum resultado para a busca realizada."
                        : "Nenhum e-mail com anexos encontrado."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((email) => <EmailRow key={email.id} email={email} />)
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
