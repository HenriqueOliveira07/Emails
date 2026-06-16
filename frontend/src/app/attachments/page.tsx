"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Image, Archive, File, FileSpreadsheet, FileCode,
  CheckCircle, XCircle,
} from "lucide-react";
import { clsx } from "clsx";

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
  total_size_mb: number;
}

function FileIcon({ fileType, filename }: { fileType: string; filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <FileText size={16} className="text-red-400" />;
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return <Image size={16} className="text-blue-400" />;
  if (["xlsx", "xls", "csv"].includes(ext)) return <FileSpreadsheet size={16} className="text-green-400" />;
  if (["zip", "tar", "gz"].includes(ext)) return <Archive size={16} className="text-yellow-400" />;
  if (["xml", "json"].includes(ext)) return <FileCode size={16} className="text-purple-400" />;
  return <File size={16} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery<AttachmentsResponse>({
    queryKey: ["attachments"],
    queryFn: () => api.get("/attachments?limit=200").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{data?.total ?? "—"}</p>
              <p className="text-sm text-slate-400 mt-1">Total de Anexos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">
                {data?.total_size_mb != null ? `${data.total_size_mb.toFixed(1)} MB` : "—"}
              </p>
              <p className="text-sm text-slate-400 mt-1">Espaço Utilizado</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-400">
                {items.filter((a) => a.has_pdf_text || a.has_ocr).length}
              </p>
              <p className="text-sm text-slate-400 mt-1">Com Extração de Texto</p>
            </div>
          </div>

          {/* File list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${items.length} arquivo(s) salvos`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Caminho</th>
                    <th className="px-4 py-3 text-right">Tamanho</th>
                    <th className="px-4 py-3 text-center">Texto Extraído</th>
                    <th className="px-4 py-3 text-center">NF/Boleto</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Carregando anexos...
                      </td>
                    </tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Nenhum anexo salvo ainda
                      </td>
                    </tr>
                  )}
                  {items.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon fileType={a.file_type} filename={a.filename} />
                          <div>
                            <p className="text-white text-xs font-medium truncate max-w-[180px]">
                              {a.filename}
                            </p>
                            {a.original_filename !== a.filename && (
                              <p className="text-slate-500 text-xs truncate max-w-[180px]">
                                Original: {a.original_filename}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-400 text-xs truncate max-w-[240px] font-mono">
                          {a.file_path}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 text-xs whitespace-nowrap">
                        {humanSize(a.file_size ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.has_pdf_text || a.has_ocr ? (
                          <CheckCircle size={14} className="text-green-400 mx-auto" />
                        ) : (
                          <XCircle size={14} className="text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.invoice_data && Object.keys(a.invoice_data).length > 0 ? (
                          <CheckCircle size={14} className="text-blue-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {a.saved_at
                          ? format(new Date(a.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
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
