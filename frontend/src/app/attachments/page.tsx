"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { FileText, Image, File, Archive, Table } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttachmentItem {
  id: number;
  email_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  file_type: string;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, string> | null;
}

interface AttachmentsResponse {
  items: AttachmentItem[];
  total: number;
}

const fetchAttachments = (limit = 100, offset = 0): Promise<AttachmentsResponse> =>
  api.get(`/emails?has_attachments=true&limit=${limit}&offset=${offset}`)
    .then(async (r) => {
      const emails = r.data.items ?? [];
      const all: AttachmentItem[] = [];
      await Promise.all(
        emails.slice(0, 20).map(async (e: { id: number }) => {
          const atts = await api.get(`/emails/${e.id}/attachments`).then((a) => a.data);
          all.push(...atts);
        })
      );
      return { items: all, total: all.length };
    });

function fileIcon(type: string) {
  if (type.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (type.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return <Table size={16} className="text-green-400" />;
  if (type.includes("zip") || type.includes("archive"))
    return <Archive size={16} className="text-yellow-400" />;
  return <File size={16} className="text-slate-400" />;
}

function humanSize(bytes: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  for (const u of units) {
    if (v < 1024) return `${v.toFixed(1)} ${u}`;
    v /= 1024;
  }
  return `${v.toFixed(1)} TB`;
}

export default function AttachmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["attachments"],
    queryFn: () => fetchAttachments(),
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total de Anexos", value: items.length },
              { label: "Com OCR/PDF", value: items.filter((a) => a.has_ocr || a.has_pdf_text).length },
              { label: "Com Dados Financeiros", value: items.filter((a) => a.invoice_data && Object.keys(a.invoice_data).length > 0).length },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Todos os Anexos</h3>
            </div>
            {isLoading && <div className="p-8 text-center text-slate-400">Carregando...</div>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Tamanho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-left">Caminho</th>
                    <th className="px-4 py-3 text-center">OCR</th>
                    <th className="px-4 py-3 text-center">PDF</th>
                    <th className="px-4 py-3 text-center">NF/Boleto</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Nenhum anexo salvo
                      </td>
                    </tr>
                  )}
                  {items.map((a) => (
                    <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">{fileIcon(a.file_type)}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200 font-medium truncate max-w-[200px]">{a.filename}</div>
                        {a.original_filename !== a.filename && (
                          <div className="text-slate-500 text-xs truncate max-w-[200px]">{a.original_filename}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{humanSize(a.file_size)}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {a.saved_at ? format(new Date(a.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 text-xs font-mono truncate block max-w-[240px]">{a.file_path}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={a.has_ocr ? "text-green-400 text-xs" : "text-slate-600 text-xs"}>
                          {a.has_ocr ? "✓" : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={a.has_pdf_text ? "text-green-400 text-xs" : "text-slate-600 text-xs"}>
                          {a.has_pdf_text ? "✓" : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={a.invoice_data && Object.keys(a.invoice_data).length > 0 ? "text-blue-400 text-xs" : "text-slate-600 text-xs"}>
                          {a.invoice_data && Object.keys(a.invoice_data).length > 0 ? "✓" : "—"}
                        </span>
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
