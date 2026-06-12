"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Paperclip, FileText, Image, Archive, Table, File,
  AlertTriangle, RefreshCw, Search, HardDrive,
} from "lucide-react";
import { clsx } from "clsx";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { fetchAttachments, fetchAttachmentStats, AttachmentItem } from "@/lib/api";

const TYPE_FILTERS = [
  { value: "", label: "Todos" },
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "word", label: "Word" },
  { value: "image", label: "Imagens" },
  { value: "zip", label: "ZIP" },
  { value: "xml", label: "XML" },
];

function FileIcon({ type }: { type: string }) {
  const t = type?.toLowerCase() ?? "";
  if (t.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (t.includes("excel") || t.includes("spreadsheet") || t.includes("csv"))
    return <Table size={16} className="text-green-400" />;
  if (t.includes("word") || t.includes("document"))
    return <FileText size={16} className="text-blue-400" />;
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("gif"))
    return <Image size={16} className="text-purple-400" />;
  if (t.includes("zip") || t.includes("compressed"))
    return <Archive size={16} className="text-yellow-400" />;
  return <File size={16} className="text-slate-400" />;
}

function AttachmentRow({ att }: { att: AttachmentItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FileIcon type={att.file_type} />
            {att.is_malicious && <AlertTriangle size={12} className="text-red-400" title="Potencialmente malicioso" />}
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-white font-medium">{att.original_filename}</p>
          <p className="text-xs text-slate-500 font-mono">{att.file_type}</p>
        </td>
        <td className="px-4 py-3">
          {att.email ? (
            <>
              <p className="text-sm text-slate-300 line-clamp-1">{att.email.subject}</p>
              <p className="text-xs text-slate-500">{att.email.sender_email}</p>
            </>
          ) : (
            <span className="text-xs text-slate-600">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          {att.file_size_human}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
          {att.saved_at
            ? format(parseISO(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
            : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            {att.has_pdf_text && (
              <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded px-1">PDF</span>
            )}
            {att.has_ocr && (
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded px-1">OCR</span>
            )}
            {att.has_invoice_data && (
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded px-1">NF</span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-800/30">
          <td colSpan={6} className="px-6 py-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">Caminho no disco</p>
                <p className="text-xs text-slate-500 font-mono break-all">{att.file_path}</p>
              </div>
              {att.ai_summary && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Resumo IA</p>
                  <p className="text-sm text-slate-300">{att.ai_summary}</p>
                </div>
              )}
              {att.has_invoice_data && Object.keys(att.invoice_data).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Dados Financeiros Extraídos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(att.invoice_data).map(([k, v]) => (
                      <div key={k} className="bg-slate-900 rounded p-2">
                        <p className="text-xs text-slate-500 capitalize">{k.replace(/_/g, " ")}</p>
                        <p className="text-xs text-white">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {att.is_malicious && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertTriangle size={12} />
                  <span>Arquivo marcado como potencialmente malicioso. Scan: {att.scan_result}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AttachmentsPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const params: Record<string, string | number | boolean> = { limit: LIMIT, offset };
  if (typeFilter) params.file_type = typeFilter;
  if (search) params.sender = search;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attachments", typeFilter, search, offset],
    queryFn: () => fetchAttachments(params),
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["attachment-stats"],
    queryFn: fetchAttachmentStats,
    refetchInterval: 60_000,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                <p className="text-2xl font-bold text-white">{stats.total_attachments}</p>
                <p className="text-xs text-slate-500">Total de anexos</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                <p className="text-2xl font-bold text-blue-400">{stats.total_size_human}</p>
                <p className="text-xs text-slate-500">Espaço utilizado</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                <p className="text-2xl font-bold text-red-400">{stats.malicious_count}</p>
                <p className="text-xs text-slate-500">Suspeitos</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 col-span-2 lg:col-span-1">
                <p className="text-xs text-slate-400 mb-2 font-semibold">Por tipo</p>
                <div className="space-y-1">
                  {Object.entries(stats.by_file_type ?? {}).slice(0, 4).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-28">{type || "desconhecido"}</span>
                      <span className="text-white font-medium">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por remetente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPE_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setTypeFilter(value); setOffset(0); }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    typeFilter === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-purple-400" />
                <span className="text-sm font-semibold text-white">Arquivos</span>
              </div>
              <span className="text-xs text-slate-400">{total} arquivos</span>
            </div>

            {isLoading ? (
              <div className="text-center text-slate-400 py-12">Carregando...</div>
            ) : items.length === 0 ? (
              <div className="text-center text-slate-500 py-12">Nenhum anexo encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-700">
                      <th className="px-4 py-2 text-left w-10" />
                      <th className="px-4 py-2 text-left">Arquivo</th>
                      <th className="px-4 py-2 text-left">E-mail</th>
                      <th className="px-4 py-2 text-left">Tamanho</th>
                      <th className="px-4 py-2 text-left">Salvo em</th>
                      <th className="px-4 py-2 text-left">Extras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((att) => (
                      <AttachmentRow key={att.id} att={att} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-700 text-slate-300"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500">
                  {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
                </span>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="px-3 py-1.5 text-xs bg-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-700 text-slate-300"
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
