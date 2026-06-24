"use client";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { api } from "@/lib/api";
import { Paperclip, File, FileText, Image, Archive } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttachmentRecord {
  id: number;
  email_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, unknown> | null;
}

interface PageData {
  items: AttachmentRecord[];
  total: number;
}

function FileIcon({ type }: { type: string | null }) {
  const t = (type || "").toLowerCase();
  if (t.includes("pdf")) return <FileText size={14} className="text-red-400" />;
  if (t.includes("image")) return <Image size={14} className="text-blue-400" />;
  if (t.includes("zip") || t.includes("archive")) return <Archive size={14} className="text-yellow-400" />;
  if (t.includes("spreadsheet") || t.includes("excel")) return <FileText size={14} className="text-green-400" />;
  return <File size={14} className="text-slate-400" />;
}

function humanSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery<PageData>({
    queryKey: ["attachments-all"],
    queryFn: () => api.get("/attachments?limit=100").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const attachments = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
              <Paperclip size={16} className="text-blue-400" />
              <h2 className="text-slate-200 font-semibold">Arquivos Salvos</h2>
              <span className="ml-auto text-slate-400 text-sm">{data?.total ?? 0} arquivos</span>
            </div>
            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : attachments.length === 0 ? (
              <div className="text-center text-slate-400 py-12">Nenhum anexo salvo ainda.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 text-left">
                    <th className="px-4 py-3 w-8"></th>
                    <th className="px-4 py-3">Arquivo</th>
                    <th className="px-4 py-3 hidden md:table-cell">Tipo</th>
                    <th className="px-4 py-3 hidden md:table-cell">Tamanho</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Caminho</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Salvo em</th>
                    <th className="px-4 py-3">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-700 hover:bg-slate-750">
                      <td className="px-4 py-3">
                        <FileIcon type={a.file_type} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200 truncate max-w-[200px]" title={a.original_filename}>
                          {a.filename}
                        </div>
                        {a.original_filename !== a.filename && (
                          <div className="text-slate-500 text-xs truncate max-w-[200px]">{a.original_filename}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400 text-xs">
                        {a.file_type?.split("/")[1] ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-400 text-xs">
                        {humanSize(a.file_size)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-slate-500 text-xs font-mono truncate max-w-[240px]" title={a.file_path}>
                          {a.file_path}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">
                        {a.saved_at ? format(new Date(a.saved_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {a.has_pdf_text && <span className="text-xs bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded">PDF</span>}
                          {a.has_ocr && <span className="text-xs bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded">OCR</span>}
                          {a.has_ai_summary && <span className="text-xs bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">IA</span>}
                          {a.invoice_data && Object.keys(a.invoice_data).length > 0 && (
                            <span className="text-xs bg-green-900/40 text-green-300 px-1.5 py-0.5 rounded">NF</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
