"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, FileText, Image, Archive, File,
  ChevronDown, ChevronUp, Search, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

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
  invoice_data: Record<string, string> | null;
  sender_email?: string;
  subject?: string;
}

function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf")) return <FileText size={14} className="text-red-400" />;
  if (type.includes("image")) return <Image size={14} className="text-blue-400" />;
  if (type.includes("zip") || type.includes("compress")) return <Archive size={14} className="text-yellow-400" />;
  if (type.includes("spreadsheet") || type.includes("excel")) return <FileText size={14} className="text-green-400" />;
  if (type.includes("word") || type.includes("document")) return <FileText size={14} className="text-blue-300" />;
  return <File size={14} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  for (const u of units) {
    if (size < 1024) return `${size.toFixed(1)} ${u}`;
    size /= 1024;
  }
  return `${size.toFixed(1)} TB`;
}

export default function AttachmentsPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attachments-all"],
    queryFn: () => api.get("/emails?has_attachments=true&limit=200").then(async (r) => {
      const emails = r.data.items ?? [];
      const allAtts: AttachmentItem[] = [];
      for (const email of emails.slice(0, 30)) {
        try {
          const res = await api.get(`/emails/${email.id}/attachments`);
          const atts = (res.data as AttachmentItem[]).map((a) => ({
            ...a,
            sender_email: email.sender_email,
            subject: email.subject,
          }));
          allAtts.push(...atts);
        } catch {
          // skip
        }
      }
      return allAtts;
    }),
    refetchInterval: 60_000,
  });

  const attachments: AttachmentItem[] = data ?? [];

  const filtered = attachments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.filename.toLowerCase().includes(q) ||
      a.original_filename.toLowerCase().includes(q) ||
      (a.sender_email ?? "").toLowerCase().includes(q) ||
      (a.subject ?? "").toLowerCase().includes(q)
    );
  });

  const totalSize = filtered.reduce((acc, a) => acc + (a.file_size || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{filtered.length}</p>
              <p className="text-xs text-slate-400 mt-1">Arquivos salvos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">{humanSize(totalSize)}</p>
              <p className="text-xs text-slate-400 mt-1">Tamanho total</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-400">
                {filtered.filter((a) => a.has_pdf_text || a.has_ocr).length}
              </p>
              <p className="text-xs text-slate-400 mt-1">Com texto extraído</p>
            </div>
          </div>

          {/* Busca + tabela */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 flex-1 max-w-sm">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por arquivo, remetente, assunto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none flex-1"
                />
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white ml-auto"
              >
                <RefreshCw size={12} />
                Atualizar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Tamanho</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-center">Extração</th>
                    <th className="px-4 py-3 text-center w-8"></th>
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
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                        onClick={() => setExpanded(expanded === att.id ? null : att.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileIcon type={att.file_type} />
                            <div>
                              <div className="text-white text-xs font-medium truncate max-w-[180px]">
                                {att.filename}
                              </div>
                              {att.original_filename !== att.filename && (
                                <div className="text-slate-500 text-xs truncate max-w-[180px]">
                                  orig: {att.original_filename}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400">{att.file_type.split("/")[1] || att.file_type}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">{humanSize(att.file_size)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[130px]">{att.sender_email ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[180px]">{att.subject ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {att.saved_at
                            ? format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {att.has_pdf_text && (
                              <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">PDF</span>
                            )}
                            {att.has_ocr && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">OCR</span>
                            )}
                            {!att.has_pdf_text && !att.has_ocr && (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === att.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === att.id && (
                        <tr key={`${att.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={8} className="px-6 py-4 space-y-2">
                            <div className="text-xs text-slate-500 font-mono break-all">
                              <span className="text-slate-400">Caminho: </span>{att.file_path}
                            </div>
                            {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
                              <div className="text-xs">
                                <span className="text-slate-400 font-medium">Dados extraídos: </span>
                                <span className="text-slate-300">{JSON.stringify(att.invoice_data)}</span>
                              </div>
                            )}
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
