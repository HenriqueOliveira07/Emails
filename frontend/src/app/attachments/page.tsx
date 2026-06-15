"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { FileText, Image, Table, Archive, File } from "lucide-react";
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
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, unknown> | null;
  sender_email?: string;
  subject?: string;
}

function FileIcon({ type }: { type: string }) {
  if (type?.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (type?.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (type?.includes("sheet") || type?.includes("excel") || type?.includes("csv"))
    return <Table size={16} className="text-green-400" />;
  if (type?.includes("zip")) return <Archive size={16} className="text-yellow-400" />;
  return <File size={16} className="text-slate-400" />;
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
  const { data = [], isLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["attachments-all"],
    queryFn: () => api.get("/emails/attachments/all?limit=200").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const totalSize = data.reduce((sum, a) => sum + (a.file_size || 0), 0);
  const withOcr = data.filter((a) => a.has_ocr || a.has_pdf_text).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{data.length}</p>
              <p className="text-sm text-slate-400 mt-1">Arquivos salvos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">{formatBytes(totalSize)}</p>
              <p className="text-sm text-slate-400 mt-1">Tamanho total</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-400">{withOcr}</p>
              <p className="text-sm text-slate-400 mt-1">Com texto extraído</p>
            </div>
          </div>

          {/* Tabela de anexos */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Arquivos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Tamanho</th>
                    <th className="px-4 py-3 text-left">Caminho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-center">OCR/PDF</th>
                    <th className="px-4 py-3 text-center">Financeiro</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Nenhum anexo salvo ainda
                      </td>
                    </tr>
                  )}
                  {data.map((att) => (
                    <tr
                      key={att.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <FileIcon type={att.file_type} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-white font-medium truncate max-w-[200px]">
                          {att.filename}
                        </div>
                        {att.original_filename !== att.filename && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            Original: {att.original_filename}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatBytes(att.file_size)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-500 truncate max-w-[240px] font-mono">
                          {att.file_path}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {att.saved_at
                          ? format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(att.has_ocr || att.has_pdf_text) ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                            {att.has_pdf_text ? "PDF" : "OCR"}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {att.invoice_data && Object.keys(att.invoice_data).length > 0 ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                            Sim
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
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
