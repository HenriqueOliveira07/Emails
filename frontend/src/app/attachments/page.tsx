"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Image, Archive, File, ChevronDown, ChevronUp, Search,
} from "lucide-react";

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
  email_id?: number;
}

function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf") || type.includes("word")) return <FileText size={16} className="text-red-400" />;
  if (type.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (type.includes("zip") || type.includes("archive")) return <Archive size={16} className="text-yellow-400" />;
  return <File size={16} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function AttachmentsPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: emails = [] } = useQuery({
    queryKey: ["emails-with-attachments"],
    queryFn: () =>
      api.get("/emails?has_attachments=true&limit=200").then((r) => r.data.items ?? []),
    refetchInterval: 60_000,
  });

  const emailIds: number[] = emails.map((e: { id: number }) => e.id);

  const { data: allAttachments = [], isLoading } = useQuery({
    queryKey: ["all-attachments", emailIds],
    queryFn: async () => {
      if (emailIds.length === 0) return [];
      const results = await Promise.all(
        emailIds.slice(0, 50).map((id: number) =>
          api.get(`/emails/${id}/attachments`).then((r) =>
            r.data.map((a: AttachmentItem) => ({ ...a, email_id: id }))
          )
        )
      );
      return results.flat() as AttachmentItem[];
    },
    enabled: emailIds.length > 0,
    refetchInterval: 60_000,
  });

  const filtered = allAttachments.filter(
    (a) =>
      !search ||
      a.filename.toLowerCase().includes(search.toLowerCase()) ||
      a.original_filename.toLowerCase().includes(search.toLowerCase()) ||
      a.file_type.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = filtered.reduce((acc, a) => acc + (a.file_size || 0), 0);
  const pdfs = filtered.filter((a) => a.file_type.includes("pdf")).length;
  const images = filtered.filter((a) => a.file_type.includes("image")).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{filtered.length}</p>
              <p className="text-xs text-slate-400 mt-1">Anexos totais</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">{humanSize(totalSize)}</p>
              <p className="text-xs text-slate-400 mt-1">Tamanho total</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{pdfs}</p>
              <p className="text-xs text-slate-400 mt-1">PDFs</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-400">{images}</p>
              <p className="text-xs text-slate-400 mt-1">Imagens (OCR)</p>
            </div>
          </div>

          {/* Busca */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou tipo de arquivo..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tabela de anexos */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${filtered.length} arquivo(s) salvos`}
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
                    <th className="px-4 py-3 text-center">OCR</th>
                    <th className="px-4 py-3 text-center">PDF</th>
                    <th className="px-4 py-3 text-center">IA</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Carregando anexos...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Nenhum anexo encontrado
                      </td>
                    </tr>
                  )}
                  {filtered.map((att) => (
                    <>
                      <tr
                        key={att.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer"
                        onClick={() => setExpanded(expanded === att.id ? null : att.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileIcon type={att.file_type} />
                            <div>
                              <p className="text-white text-xs font-medium truncate max-w-[200px]">
                                {att.filename}
                              </p>
                              <p className="text-slate-500 text-xs truncate max-w-[200px]">
                                {att.original_filename}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {att.file_type.split("/").pop()?.toUpperCase() || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {humanSize(att.file_size)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {att.saved_at
                            ? format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={att.has_ocr ? "text-green-400 text-xs" : "text-slate-600 text-xs"}>
                            {att.has_ocr ? "✓" : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={att.has_pdf_text ? "text-green-400 text-xs" : "text-slate-600 text-xs"}>
                            {att.has_pdf_text ? "✓" : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={att.has_ai_summary ? "text-green-400 text-xs" : "text-slate-600 text-xs"}>
                            {att.has_ai_summary ? "✓" : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === att.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === att.id && (
                        <tr key={`${att.id}-detail`} className="bg-slate-900/60">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-1 text-xs text-slate-400">
                              <p>
                                <span className="text-slate-500 font-medium">Caminho: </span>
                                <span className="font-mono text-slate-300">{att.file_path}</span>
                              </p>
                              {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">Dados extraídos:</p>
                                  <div className="bg-slate-800 rounded p-2 font-mono text-xs text-slate-300">
                                    {Object.entries(att.invoice_data).map(([k, v]) => (
                                      <div key={k}>
                                        <span className="text-blue-400">{k}:</span> {String(v)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
