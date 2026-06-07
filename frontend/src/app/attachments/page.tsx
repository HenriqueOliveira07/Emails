"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, Archive, File } from "lucide-react";
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
  has_invoice_data: boolean;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (fileType.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (fileType.includes("zip")) return <Archive size={16} className="text-yellow-400" />;
  return <File size={16} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery<{ items: AttachmentItem[]; total: number }>({
    queryKey: ["attachments"],
    queryFn: () => api.get("/emails/attachments?limit=100").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const attachments = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Resumo */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <Paperclip size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data?.total ?? 0}</p>
              <p className="text-sm text-slate-400">Anexos salvos no total</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Arquivos Salvos</h3>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando anexos...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left w-8"></th>
                      <th className="px-4 py-3 text-left">Arquivo</th>
                      <th className="px-4 py-3 text-left">Caminho</th>
                      <th className="px-4 py-3 text-left">Tamanho</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Extras</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Nenhum anexo salvo ainda
                        </td>
                      </tr>
                    )}
                    {attachments.map((att) => (
                      <tr
                        key={att.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <FileIcon fileType={att.file_type} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 font-medium truncate max-w-[180px]">
                            {att.filename}
                          </div>
                          {att.original_filename !== att.filename && (
                            <div className="text-slate-500 text-xs truncate max-w-[180px]">
                              {att.original_filename}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono max-w-[240px] truncate">
                          {att.file_path}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {humanSize(att.file_size)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {att.file_type.split("/").pop() || att.file_type}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {att.has_ocr && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">OCR</span>
                            )}
                            {att.has_pdf_text && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">PDF</span>
                            )}
                            {att.has_invoice_data && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">NF</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                          {att.saved_at
                            ? format(new Date(att.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
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
