"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, Archive, Table } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttachmentRecord {
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
  invoice_data: Record<string, unknown>;
}

interface AttachmentStats {
  total: number;
  total_size_mb: number;
  items: AttachmentRecord[];
}

async function fetchAttachments(): Promise<AttachmentStats> {
  const emails = await api.get("/emails?limit=200&has_attachments=true").then((r) => r.data);
  const items: AttachmentRecord[] = [];
  await Promise.all(
    (emails.items ?? []).slice(0, 30).map(async (email: { id: number }) => {
      const atts = await api.get(`/emails/${email.id}/attachments`).then((r) => r.data);
      items.push(...atts);
    })
  );
  const total_size_mb = items.reduce((sum, a) => sum + (a.file_size || 0), 0) / (1024 * 1024);
  return { total: items.length, total_size_mb, items };
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf")) return <FileText size={14} className="text-red-400" />;
  if (mimeType.includes("image")) return <Image size={14} className="text-blue-400" />;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return <Archive size={14} className="text-orange-400" />;
  if (mimeType.includes("sheet") || mimeType.includes("csv")) return <Table size={14} className="text-green-400" />;
  return <Paperclip size={14} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["attachments"],
    queryFn: fetchAttachments,
    refetchInterval: 60_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-white">{data?.total ?? "—"}</p>
              <p className="text-sm text-slate-400">Arquivos salvos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex-1">
              <p className="text-2xl font-bold text-blue-400">
                {data?.total_size_mb != null ? `${data.total_size_mb.toFixed(1)} MB` : "—"}
              </p>
              <p className="text-sm text-slate-400">Espaço total</p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Arquivos Salvos</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Organizado em /attachments/YYYY/MM/DD/Remetente/
              </p>
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
                      <th className="px-4 py-3 text-left">Tamanho</th>
                      <th className="px-4 py-3 text-left">Processamento</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Nenhum anexo salvo ainda
                        </td>
                      </tr>
                    )}
                    {(data?.items ?? []).map((att) => (
                      <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileIcon mimeType={att.file_type} />
                            <div>
                              <p className="text-slate-200 truncate max-w-[200px]">{att.filename}</p>
                              {att.original_filename !== att.filename && (
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                  orig: {att.original_filename}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[120px]">
                          {att.file_type || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {att.file_size ? humanSize(att.file_size) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {att.has_pdf_text && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">PDF</span>
                            )}
                            {att.has_ocr && (
                              <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">OCR</span>
                            )}
                            {att.has_ai_summary && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">IA</span>
                            )}
                            {Object.keys(att.invoice_data ?? {}).length > 0 && (
                              <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">NF/Bol</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
