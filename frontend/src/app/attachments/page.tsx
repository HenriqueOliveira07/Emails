"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchEmails, fetchEmailAttachments, EmailItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  FileText,
  Image,
  Archive,
  File,
  Table,
  FileCode,
  Paperclip,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf")) return <FileText size={18} className="text-red-400" />;
  if (mimeType.includes("image")) return <Image size={18} className="text-purple-400" />;
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return <Archive size={18} className="text-yellow-400" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return <Table size={18} className="text-green-400" />;
  if (mimeType.includes("xml") || mimeType.includes("html"))
    return <FileCode size={18} className="text-blue-400" />;
  return <File size={18} className="text-slate-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileTypeBadge({ mimeType }: { mimeType: string }) {
  const ext = mimeType.split("/").pop()?.toUpperCase() ?? "FILE";
  const shortExt =
    ext === "VND.OPENXMLFORMATS-OFFICEDOCUMENT.SPREADSHEETML.SHEET"
      ? "XLSX"
      : ext === "VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT"
      ? "DOCX"
      : ext.length > 6
      ? ext.slice(0, 6)
      : ext;
  return (
    <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-mono">
      {shortExt}
    </span>
  );
}

export default function AttachmentsPage() {
  const [search, setSearch] = useState("");

  const { data: emailsData } = useQuery({
    queryKey: ["emails-with-attachments"],
    queryFn: () => fetchEmails({ has_attachments: true, limit: 100 }),
    refetchInterval: 60_000,
  });

  const emailsWithAttachments: EmailItem[] = emailsData?.items ?? [];

  const attachmentQueries = useQueries({
    queries: emailsWithAttachments.map((e) => ({
      queryKey: ["email-attachments", e.id],
      queryFn: () => fetchEmailAttachments(e.id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const allAttachments = attachmentQueries
    .flatMap((q, idx) =>
      (q.data ?? []).map((att) => ({
        ...att,
        emailSubject: emailsWithAttachments[idx]?.subject ?? "",
        emailSender: emailsWithAttachments[idx]?.sender_email ?? "",
        emailReceivedAt: emailsWithAttachments[idx]?.received_at ?? null,
        emailPriority: emailsWithAttachments[idx]?.priority ?? "BAIXO",
      }))
    )
    .filter(
      (a) =>
        !search ||
        a.original_filename.toLowerCase().includes(search.toLowerCase()) ||
        a.emailSender.toLowerCase().includes(search.toLowerCase())
    );

  const isLoading = attachmentQueries.some((q) => q.isLoading);
  const totalSize = allAttachments.reduce((sum, a) => sum + (a.file_size ?? 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Total de Anexos",
                value: allAttachments.length,
                color: "text-blue-400",
              },
              {
                label: "E-mails com Anexos",
                value: emailsWithAttachments.length,
                color: "text-purple-400",
              },
              {
                label: "Tamanho Total",
                value: formatBytes(totalSize),
                color: "text-green-400",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center"
              >
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-slate-400 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome de arquivo ou remetente..."
              className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Attachments grid */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Carregando anexos...</div>
          ) : allAttachments.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Paperclip size={32} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum anexo encontrado.</p>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Arquivo</th>
                    <th className="px-4 py-3">E-mail de Origem</th>
                    <th className="px-4 py-3 w-24">Tipo</th>
                    <th className="px-4 py-3 w-24">Tamanho</th>
                    <th className="px-4 py-3 w-32">Salvo</th>
                    <th className="px-4 py-3 w-20 text-center">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttachments.map((att) => (
                    <tr
                      key={att.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <FileIcon mimeType={att.file_type ?? ""} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[200px]">
                          {att.original_filename}
                        </p>
                        <p className="text-slate-500 text-xs truncate max-w-[200px] mt-0.5">
                          {att.file_path.split("/").slice(-4).join("/")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 text-xs truncate max-w-[220px]">
                          {att.emailSubject}
                        </p>
                        <p className="text-slate-500 text-xs">{att.emailSender}</p>
                      </td>
                      <td className="px-4 py-3">
                        <FileTypeBadge mimeType={att.file_type ?? ""} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {formatBytes(att.file_size ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {att.saved_at
                          ? formatDistanceToNow(new Date(att.saved_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                          {att.has_pdf_text && (
                            <span title="Texto PDF extraído" className="text-red-400">PDF</span>
                          )}
                          {att.has_ocr && (
                            <span title="OCR executado" className="text-purple-400">OCR</span>
                          )}
                          {att.has_ai_summary && (
                            <span title="Resumo IA disponível" className="text-blue-400">IA</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
