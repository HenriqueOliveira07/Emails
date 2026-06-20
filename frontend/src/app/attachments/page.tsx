"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAttachments, fetchAttachmentStats, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, Archive, Search, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function humanSize(bytes: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let s = bytes;
  for (const u of units) {
    if (s < 1024) return `${s.toFixed(1)} ${u}`;
    s /= 1024;
  }
  return `${s.toFixed(1)} GB`;
}

function fileIcon(type: string | null) {
  if (!type) return <Paperclip size={14} className="text-slate-400" />;
  if (type.includes("pdf") || type.includes("word") || type.includes("document"))
    return <FileText size={14} className="text-red-400" />;
  if (type.includes("image"))
    return <Image size={14} className="text-blue-400" />;
  if (type.includes("zip") || type.includes("archive"))
    return <Archive size={14} className="text-yellow-400" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv"))
    return <FileText size={14} className="text-green-400" />;
  return <Paperclip size={14} className="text-slate-400" />;
}

export default function AttachmentsPage() {
  const [sender, setSender] = useState("");
  const [senderInput, setSenderInput] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const params: Record<string, string | number> = { limit, offset };
  if (sender) params.sender = sender;

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", sender, offset],
    queryFn: () => fetchAttachments(params),
  });

  const { data: stats } = useQuery({
    queryKey: ["attachment-stats"],
    queryFn: fetchAttachmentStats,
  });

  const items: AttachmentItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  function applySearch() {
    setSender(senderInput);
    setOffset(0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Paperclip size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.total_files}</p>
                    <p className="text-xs text-slate-400">Arquivos salvos</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Database size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.total_size_mb} MB</p>
                    <p className="text-xs text-slate-400">Tamanho total</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-medium mb-2">Por tipo</p>
                  {Object.entries((stats.by_type ?? {}) as Record<string, number>).slice(0, 4).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[150px]">{type || "desconhecido"}</span>
                      <span className="text-white font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-3 items-center">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por remetente..."
              value={senderInput}
              onChange={(e) => setSenderInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              onClick={applySearch}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white transition-colors"
            >
              Buscar
            </button>
            {sender && (
              <button
                onClick={() => { setSender(""); setSenderInput(""); setOffset(0); }}
                className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded-lg text-xs text-white transition-colors"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            {total} arquivo{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </div>

          {/* Attachments table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">E-mail</th>
                    <th className="px-4 py-3 text-right">Tamanho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-center">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Carregando...</td></tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Nenhum anexo encontrado</td></tr>
                  )}
                  {items.map((att) => (
                    <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">{fileIcon(att.file_type)}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-white truncate max-w-[200px]" title={att.filename}>
                          {att.filename}
                        </div>
                        {att.original_filename !== att.filename && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            orig: {att.original_filename}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-300 truncate max-w-[140px]">
                          {att.sender_name || att.sender_email}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[140px]">{att.sender_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-400 truncate max-w-[180px]">{att.email_subject}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">
                        {humanSize(att.file_size)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {att.saved_at
                          ? format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {att.has_ocr && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">OCR</span>
                          )}
                          {att.has_pdf_text && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">PDF</span>
                          )}
                          {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">NF</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-xs text-white transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-400">
                {offset + 1}–{Math.min(offset + limit, total)} de {total}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-xs text-white transition-colors"
              >
                Próximo →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
