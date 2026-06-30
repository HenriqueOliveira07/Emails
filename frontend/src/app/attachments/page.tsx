"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { FileText, Image, Archive, File, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Attachment {
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
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (mimeType.includes("image")) return <Image size={16} className="text-purple-400" />;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return <Archive size={16} className="text-yellow-400" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return <FileSpreadsheet size={16} className="text-green-400" />;
  return <File size={16} className="text-blue-400" />;
}

function humanSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  for (const u of units) {
    if (v < 1024) return `${v.toFixed(1)} ${u}`;
    v /= 1024;
  }
  return `${v.toFixed(1)} TB`;
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery<{ items: Attachment[]; total: number }>({
    queryKey: ["attachments-all"],
    queryFn: () => api.get("/dashboard/recent-emails?limit=200").then(async (r) => {
      const emails = r.data.items ?? [];
      const promises = emails
        .filter((e: { has_attachments: boolean }) => e.has_attachments)
        .map((e: { id: number }) => api.get(`/emails/${e.id}/attachments`).then((a) => a.data));
      const nested = await Promise.all(promises);
      const items = nested.flat();
      return { items, total: items.length };
    }),
    refetchInterval: 60_000,
  });

  const attachments: Attachment[] = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Anexos Salvos</h3>
              <span className="text-xs text-slate-400">{attachments.length} arquivo(s)</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando anexos...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Nome do Arquivo</th>
                      <th className="px-4 py-3 text-left">Tamanho</th>
                      <th className="px-4 py-3 text-left">Caminho</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                      <th className="px-4 py-3 text-center">OCR</th>
                      <th className="px-4 py-3 text-center">PDF</th>
                      <th className="px-4 py-3 text-center">IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          Nenhum anexo salvo ainda
                        </td>
                      </tr>
                    )}
                    {attachments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <FileIcon mimeType={a.file_type ?? ""} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200 text-xs font-medium truncate max-w-[200px]">{a.filename}</div>
                          <div className="text-slate-500 text-xs truncate max-w-[200px]">{a.original_filename}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {humanSize(a.file_size ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[240px] truncate font-mono">
                          {a.file_path}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {a.saved_at
                            ? format(new Date(a.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.has_ocr ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.has_pdf_text ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.has_ai_summary ? (
                            <span className="text-blue-400 text-xs">✓</span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
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
