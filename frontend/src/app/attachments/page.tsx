"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllAttachments, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  FileText, FileSpreadsheet, FileImage, FileArchive, File,
  AlertTriangle, Brain, Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PAGE_SIZE = 50;

function FileIcon({ type, filename }: { type: string; filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const cls = "shrink-0";
  if (ext === "pdf" || type.includes("pdf")) return <FileText size={18} className={clsx(cls, "text-red-400")} />;
  if (ext === "xlsx" || ext === "xls" || type.includes("spreadsheet") || type.includes("excel"))
    return <FileSpreadsheet size={18} className={clsx(cls, "text-green-400")} />;
  if (["jpg", "jpeg", "png", "gif"].includes(ext) || type.startsWith("image/"))
    return <FileImage size={18} className={clsx(cls, "text-purple-400")} />;
  if (ext === "zip" || type.includes("zip"))
    return <FileArchive size={18} className={clsx(cls, "text-yellow-400")} />;
  return <File size={18} className={clsx(cls, "text-slate-400")} />;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function AttachmentsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", page],
    queryFn: () => fetchAllAttachments({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    refetchInterval: 60_000,
  });

  const attachments: AttachmentItem[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? attachments.filter(
        (a) =>
          a.filename.toLowerCase().includes(search.toLowerCase()) ||
          (a.sender_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (a.subject ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : attachments;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-xs text-slate-400 mt-1">Total de Anexos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">
                {attachments.filter((a) => a.has_ocr).length}
              </p>
              <p className="text-xs text-slate-400 mt-1">Com OCR</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">
                {attachments.filter((a) => a.is_malicious).length}
              </p>
              <p className="text-xs text-slate-400 mt-1">Suspeitos</p>
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por arquivo, remetente ou assunto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Lista */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Arquivos Salvos</h3>
              <span className="text-xs text-slate-400">{filtered.length} arquivos</span>
            </div>
            <div className="divide-y divide-slate-700/50">
              {isLoading && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">Carregando...</div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  Nenhum anexo encontrado
                </div>
              )}
              {filtered.map((att) => (
                <div key={att.id} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-700/20 transition-colors">
                  <div className="mt-0.5">
                    <FileIcon type={att.file_type} filename={att.filename} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-white font-medium truncate">{att.filename}</p>
                      {att.original_filename !== att.filename && (
                        <span className="text-xs text-slate-500">({att.original_filename})</span>
                      )}
                      {att.is_malicious && (
                        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={10} /> Suspeito
                        </span>
                      )}
                      {att.has_ai_summary && (
                        <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          <Brain size={10} /> IA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{formatBytes(att.file_size)}</span>
                      {att.file_type && <span>{att.file_type}</span>}
                      {att.saved_at && (
                        <span>{format(new Date(att.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      )}
                    </div>
                    {(att.sender_email || att.subject) && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        {att.sender_email && <span className="text-blue-400">{att.sender_email}</span>}
                        {att.subject && <span className="truncate max-w-[300px]">{att.subject}</span>}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 mt-1 truncate">{att.file_path}</p>
                  </div>
                  <div className="shrink-0 flex gap-1.5">
                    {att.has_ocr && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">OCR</span>
                    )}
                    {att.has_pdf_text && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">PDF</span>
                    )}
                    {Object.keys(att.invoice_data).length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">NF</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm text-slate-400">
                Página {page + 1} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
