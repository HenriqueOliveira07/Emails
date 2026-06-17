"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, Archive, Table, File } from "lucide-react";
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

function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf")) return <FileText size={14} className="text-red-400" />;
  if (type.includes("image")) return <Image size={14} className="text-blue-400" />;
  if (type.includes("zip")) return <Archive size={14} className="text-yellow-400" />;
  if (type.includes("sheet") || type.includes("csv") || type.includes("excel"))
    return <Table size={14} className="text-green-400" />;
  return <File size={14} className="text-slate-400" />;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function AttachmentsPage() {
  const { data: attachments = [], isLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["attachments"],
    queryFn: () => api.get("/emails/attachments/all?limit=200").then((r) => r.data).catch(() => []),
    refetchInterval: 60_000,
  });

  const totalSize = attachments.reduce((acc, a) => acc + (a.file_size || 0), 0);
  const pdfs = attachments.filter((a) => a.has_pdf_text || a.file_type.includes("pdf")).length;
  const withOcr = attachments.filter((a) => a.has_ocr).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total de Anexos", value: attachments.length, cls: "text-blue-400" },
              { label: "Tamanho Total", value: formatBytes(totalSize), cls: "text-purple-400" },
              { label: "PDFs Processados", value: pdfs, cls: "text-red-400" },
              { label: "Com OCR", value: withOcr, cls: "text-green-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
                <p className="text-slate-400 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
              <Paperclip size={14} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-white">Arquivos Salvos</h3>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
            ) : attachments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <Paperclip size={32} className="mx-auto mb-3 opacity-30" />
                Nenhum anexo salvo ainda
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Arquivo</th>
                      <th className="px-4 py-3 text-left">Caminho</th>
                      <th className="px-4 py-3 text-left">Tamanho</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                      <th className="px-4 py-3 text-center">Processamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <FileIcon type={a.file_type} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-200 text-xs font-medium truncate max-w-[220px]">{a.filename}</p>
                          {a.original_filename !== a.filename && (
                            <p className="text-slate-500 text-xs truncate max-w-[220px]">{a.original_filename}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-400 text-xs truncate max-w-[280px] font-mono">{a.file_path}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {formatBytes(a.file_size)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {a.saved_at
                            ? format(new Date(a.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {a.has_pdf_text && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">PDF</span>
                            )}
                            {a.has_ocr && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">OCR</span>
                            )}
                            {a.has_ai_summary && (
                              <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">IA</span>
                            )}
                            {!a.has_pdf_text && !a.has_ocr && !a.has_ai_summary && (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </div>
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
