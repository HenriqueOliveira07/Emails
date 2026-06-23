"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, FileSpreadsheet, Archive, File } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttachmentItem {
  id: number;
  email_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  saved_at: string;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, string> | null;
}

interface AttachmentsResponse {
  items: AttachmentItem[];
  total: number;
}

const fetchAttachments = (): Promise<AttachmentsResponse> =>
  api.get("/emails?has_attachments=true&limit=100").then(async (r) => {
    const emails = r.data.items as { id: number }[];
    const all: AttachmentItem[] = [];
    for (const email of emails.slice(0, 20)) {
      const atts = await api
        .get(`/emails/${email.id}/attachments`)
        .then((res) => res.data as AttachmentItem[]);
      all.push(...atts);
    }
    return { items: all, total: all.length };
  });

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

function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (type.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet size={16} className="text-green-400" />;
  if (type.includes("zip")) return <Archive size={16} className="text-yellow-400" />;
  return <File size={16} className="text-slate-400" />;
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["attachments"],
    queryFn: fetchAttachments,
    refetchInterval: 60_000,
  });

  const attachments = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
              <Paperclip size={14} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-white">
                Anexos Salvos ({attachments.length})
              </h3>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando anexos...</div>
            ) : attachments.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                Nenhum anexo salvo ainda
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Arquivo</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Tamanho</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                      <th className="px-4 py-3 text-left">Caminho</th>
                      <th className="px-4 py-3 text-center">OCR</th>
                      <th className="px-4 py-3 text-center">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((att) => (
                      <tr
                        key={att.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileIcon type={att.file_type} />
                            <div>
                              <div className="text-slate-200 text-xs font-medium truncate max-w-[200px]">
                                {att.filename}
                              </div>
                              {att.original_filename !== att.filename && (
                                <div className="text-slate-500 text-xs truncate max-w-[200px]">
                                  {att.original_filename}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {att.file_type.split("/")[1]?.toUpperCase() || att.file_type}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {humanSize(att.file_size)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {att.saved_at
                            ? format(new Date(att.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono truncate max-w-[240px]">
                          {att.file_path}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {att.has_ocr ? (
                            <span className="text-blue-400">Sim</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {att.has_pdf_text ? (
                            <span className="text-green-400">Sim</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
