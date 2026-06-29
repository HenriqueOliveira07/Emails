"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchAttachments, fetchAttachmentStats, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, HardDrive, FileText, Image, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function fileIcon(type: string) {
  if (type.includes("pdf")) return <FileText size={14} className="text-red-400" />;
  if (type.includes("image")) return <Image size={14} className="text-blue-400" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return <FileText size={14} className="text-green-400" />;
  return <Paperclip size={14} className="text-slate-400" />;
}

export default function AttachmentsPage() {
  const [sender, setSender] = useState("");
  const [fileType, setFileType] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const params: Record<string, string | number> = { limit, offset: page * limit };
  if (sender) params.sender = sender;
  if (fileType) params.file_type = fileType;

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", sender, fileType, page],
    queryFn: () => fetchAttachments(params),
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["attachment-stats"],
    queryFn: fetchAttachmentStats,
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Paperclip className="text-blue-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.total_attachments ?? "--"}</p>
                <p className="text-xs text-slate-400">Total de Anexos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <HardDrive className="text-purple-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.total_size_mb ?? 0} MB</p>
                <p className="text-xs text-slate-400">Espaco Utilizado</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <FileText className="text-orange-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.with_pdf_text ?? 0}</p>
                <p className="text-xs text-slate-400">PDFs Extraidos</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <Image className="text-green-400" size={20} />
              <div>
                <p className="text-xl font-bold text-white">{stats?.with_ocr ?? 0}</p>
                <p className="text-xs text-slate-400">OCR Processados</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por remetente..."
                value={sender}
                onChange={(e) => { setSender(e.target.value); setPage(0); }}
                className="bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-400 w-56"
              />
            </div>
            <select
              value={fileType}
              onChange={(e) => { setFileType(e.target.value); setPage(0); }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="">Todos os tipos</option>
              <option value="pdf">PDF</option>
              <option value="spreadsheet">Excel/CSV</option>
              <option value="word">Word</option>
              <option value="image">Imagens</option>
              <option value="zip">ZIP</option>
              <option value="xml">XML</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">E-mail</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Tamanho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-center">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Carregando...</td></tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum anexo encontrado</td></tr>
                  )}
                  {items.map((a) => (
                    <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {fileIcon(a.file_type)}
                          <div>
                            <p className="text-white text-xs font-medium truncate max-w-[200px]">{a.filename}</p>
                            {a.original_filename !== a.filename && (
                              <p className="text-slate-500 text-[10px] truncate max-w-[200px]">{a.original_filename}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 truncate max-w-[140px]">
                        {a.sender_name || a.sender_email}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[180px]">
                        {a.email_subject}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{a.file_type.split("/").pop()}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 text-right whitespace-nowrap">
                        {formatBytes(a.file_size)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {a.saved_at ? format(new Date(a.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "--"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {a.has_pdf_text && (
                            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded">PDF</span>
                          )}
                          {a.has_ocr && (
                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded">OCR</span>
                          )}
                          {a.has_ai_summary && (
                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded">IA</span>
                          )}
                          {a.is_malicious && (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded">MAL</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Total: {data?.total ?? 0} anexos &middot; Pagina {page + 1}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300">
                  Anterior
                </button>
                <button onClick={() => setPage(page + 1)} disabled={items.length < limit}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300">
                  Proximo
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
