"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, Archive, FileSpreadsheet, File } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttachmentItem {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, string> | null;
  email_id: number;
  sender_email?: string;
  subject?: string;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (mime.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (mime.includes("zip") || mime.includes("rar")) return <Archive size={16} className="text-yellow-400" />;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return <FileSpreadsheet size={16} className="text-green-400" />;
  return <File size={16} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const [search, setSearch] = useState("");

  const { data: attachments = [], isLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["attachments-all"],
    queryFn: () => api.get("/attachments?limit=200").then((r) => r.data),
    staleTime: 60_000,
  });

  const filtered = attachments.filter(
    (a) =>
      a.filename.toLowerCase().includes(search.toLowerCase()) ||
      a.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = attachments.reduce((acc, a) => acc + (a.file_size || 0), 0);
  const pdfCount = attachments.filter((a) => a.file_type?.includes("pdf")).length;
  const imgCount = attachments.filter((a) => a.file_type?.includes("image")).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total de Anexos", value: attachments.length, cls: "text-white" },
              { label: "Tamanho Total", value: humanSize(totalSize), cls: "text-blue-400" },
              { label: "PDFs", value: pdfCount, cls: "text-red-400" },
              { label: "Imagens", value: imgCount, cls: "text-purple-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome de arquivo..."
              className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Lista */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                <Paperclip size={14} className="inline mr-2 text-slate-400" />
                Anexos ({filtered.length})
              </h3>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando anexos...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Arquivo</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-right">Tamanho</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                      <th className="px-4 py-3 text-center">Recursos</th>
                      <th className="px-4 py-3 text-left">Caminho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          Nenhum anexo encontrado
                        </td>
                      </tr>
                    )}
                    {filtered.map((att) => (
                      <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileIcon mime={att.file_type || ""} />
                            <div>
                              <p className="text-slate-200 truncate max-w-[220px]">{att.filename}</p>
                              {att.original_filename !== att.filename && (
                                <p className="text-xs text-slate-500 truncate max-w-[220px]">
                                  Original: {att.original_filename}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{att.file_type || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-right">{humanSize(att.file_size || 0)}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {att.saved_at
                            ? format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {att.has_pdf_text && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">PDF</span>
                            )}
                            {att.has_ocr && (
                              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">OCR</span>
                            )}
                            {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">NF</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs font-mono truncate max-w-[200px]">
                          {att.file_path}
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
