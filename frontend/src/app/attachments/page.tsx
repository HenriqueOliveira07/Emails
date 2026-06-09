"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { FileText, Image, Archive, File, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

interface AttachmentRecord {
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
  invoice_data: Record<string, string> | null;
  sender_email?: string;
  subject?: string;
}

interface AttachmentResponse {
  items: AttachmentRecord[];
  total: number;
}

const fetchAttachments = (params: Record<string, string | number>): Promise<AttachmentResponse> =>
  api.get("/attachments", { params }).then((r) => r.data);

function fileIcon(type: string) {
  if (type.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (type.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (type.includes("zip") || type.includes("archive")) return <Archive size={16} className="text-yellow-400" />;
  if (type.includes("sheet") || type.includes("csv") || type.includes("excel"))
    return <FileText size={16} className="text-green-400" />;
  return <File size={16} className="text-slate-400" />;
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

export default function AttachmentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const params: Record<string, string | number> = { limit, offset: page * limit };
  if (search) params.filename = search;

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", search, page],
    queryFn: () => fetchAttachments(params),
    refetchInterval: 60_000,
  });

  const items: AttachmentRecord[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Buscar arquivo</label>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="nome do arquivo..."
                  className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-sm w-64"
                />
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            <span className="text-sm text-slate-300">
              <span className="text-white font-semibold">{total}</span> anexo(s) salvos
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400">
              Organização: <code className="text-blue-400">/Emails_Importantes/YYYY/MM/DD/Remetente/</code>
            </span>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${items.length} arquivo(s) nesta página`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Tamanho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-left">Caminho</th>
                    <th className="px-4 py-3 text-center">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Carregando anexos...
                      </td>
                    </tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhum anexo encontrado
                      </td>
                    </tr>
                  )}
                  {items.map((att) => (
                    <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {fileIcon(att.file_type || "")}
                          <div>
                            <div className="text-slate-200 text-xs font-medium truncate max-w-[200px]">
                              {att.filename}
                            </div>
                            {att.original_filename !== att.filename && (
                              <div className="text-slate-500 text-xs truncate max-w-[200px]">
                                Original: {att.original_filename}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{att.file_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {humanSize(att.file_size)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {att.saved_at
                          ? format(new Date(att.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <code className="truncate max-w-[240px] block">{att.file_path}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {att.has_pdf_text && (
                            <span title="Texto extraído" className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                              PDF
                            </span>
                          )}
                          {att.has_ocr && (
                            <span title="OCR extraído" className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                              OCR
                            </span>
                          )}
                          {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
                            <span title="Dados de NF/boleto" className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                              NF
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-400">
                  Página {page + 1} · Total: {total}
                </span>
                <button
                  disabled={items.length < limit}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
