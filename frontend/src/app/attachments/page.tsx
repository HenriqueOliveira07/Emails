"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchAttachments, fetchAttachmentStats, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, FileText, Image, Archive, HardDrive } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const FileIcon = ({ type }: { type: string }) => {
  if (type?.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (type?.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (type?.includes("zip") || type?.includes("archive")) return <Archive size={16} className="text-yellow-400" />;
  return <Paperclip size={16} className="text-slate-400" />;
};

export default function AttachmentsPage() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", offset],
    queryFn: () => fetchAttachments({ limit, offset }),
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["attachment-stats"],
    queryFn: fetchAttachmentStats,
    refetchInterval: 60_000,
  });

  const attachments: AttachmentItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <Paperclip size={20} className="text-blue-400" />
                <div>
                  <p className="text-xl font-bold text-white">{stats.total_count}</p>
                  <p className="text-xs text-slate-400">Total de anexos</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <HardDrive size={20} className="text-purple-400" />
                <div>
                  <p className="text-xl font-bold text-white">{stats.total_size_human}</p>
                  <p className="text-xs text-slate-400">Tamanho total</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <HardDrive size={20} className="text-green-400" />
                <div>
                  <p className="text-xl font-bold text-white">{stats.disk_usage_mb.toFixed(1)} MB</p>
                  <p className="text-xs text-slate-400">Uso em disco</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <FileText size={20} className="text-red-400" />
                <div>
                  <p className="text-xl font-bold text-white">{stats.malicious_count}</p>
                  <p className="text-xs text-slate-400">Bloqueados</p>
                </div>
              </div>
            </div>
          )}

          {/* Attachments Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Arquivos Salvos</h3>
              <span className="text-xs text-slate-400">{total} arquivo(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Tamanho</th>
                    <th className="px-4 py-3 text-left">Caminho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-center">OCR</th>
                    <th className="px-4 py-3 text-center">IA</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && attachments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Nenhum anexo salvo ainda
                      </td>
                    </tr>
                  )}
                  {attachments.map((att) => (
                    <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon type={att.file_type} />
                          <div>
                            <p className="text-white text-xs font-medium truncate max-w-[160px]">
                              {att.filename}
                            </p>
                            <p className="text-slate-500 text-xs truncate max-w-[160px]">
                              {att.original_filename}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{att.file_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{att.file_size_human}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono truncate max-w-[200px]">
                        {att.file_path}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {att.saved_at
                          ? format(new Date(att.saved_at), "dd/MM HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs ${att.has_ocr ? "text-green-400" : "text-slate-600"}`}>
                          {att.has_ocr ? "✓" : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs ${att.has_ai_summary ? "text-blue-400" : "text-slate-600"}`}>
                          {att.has_ai_summary ? "✓" : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-400">
                {Math.floor(offset / limit) + 1} de {Math.ceil(total / limit)}
              </span>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
              >
                Próximo
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
