"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAttachments, fetchAttachmentStats, summarizeAttachment, humanFileSize } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, HardDrive, FileText, Image, Sparkles, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MIME_ICON: Record<string, React.ReactNode> = {
  pdf: <FileText size={14} className="text-red-400" />,
  image: <Image size={14} className="text-blue-400" />,
  default: <Paperclip size={14} className="text-slate-400" />,
};

function getMimeIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return MIME_ICON.pdf;
  if (mimeType.startsWith("image/")) return MIME_ICON.image;
  return MIME_ICON.default;
}

function getExtBadge(filename: string) {
  const ext = filename.split(".").pop()?.toUpperCase() ?? "";
  const colors: Record<string, string> = {
    PDF: "bg-red-500/20 text-red-400",
    XLSX: "bg-green-500/20 text-green-400",
    XLS: "bg-green-500/20 text-green-400",
    DOCX: "bg-blue-500/20 text-blue-400",
    DOC: "bg-blue-500/20 text-blue-400",
    CSV: "bg-yellow-500/20 text-yellow-400",
    ZIP: "bg-purple-500/20 text-purple-400",
    XML: "bg-orange-500/20 text-orange-400",
    PNG: "bg-cyan-500/20 text-cyan-400",
    JPG: "bg-cyan-500/20 text-cyan-400",
    JPEG: "bg-cyan-500/20 text-cyan-400",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${colors[ext] ?? "bg-slate-700 text-slate-400"}`}>
      {ext || "?"}
    </span>
  );
}

export default function AttachmentsPage() {
  const qc = useQueryClient();
  const [fileType, setFileType] = useState("");
  const [hasOcr, setHasOcr] = useState<"" | "true" | "false">("");
  const [toast, setToast] = useState<string | null>(null);

  const params: Record<string, string | number | boolean> = { limit: 100, offset: 0 };
  if (fileType) params.file_type = fileType;
  if (hasOcr !== "") params.has_ocr = hasOcr === "true";

  const { data: attachData, isLoading } = useQuery({
    queryKey: ["attachments", params],
    queryFn: () => fetchAttachments(params),
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["attachment-stats"],
    queryFn: fetchAttachmentStats,
    refetchInterval: 60_000,
  });

  const summarize = useMutation({
    mutationFn: (id: number) => summarizeAttachment(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["attachments"] });
      showToast(data.summary ? "Resumo gerado com sucesso!" : "Nenhum texto encontrado no arquivo");
    },
    onError: () => showToast("Erro ao gerar resumo — arquivo sem texto extraído"),
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const attachments = attachData?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {toast && (
            <div className="fixed top-4 right-4 z-50 bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-sm shadow-lg max-w-sm">
              {toast}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <Paperclip size={20} className="text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_attachments}</p>
                  <p className="text-xs text-slate-400">Total de anexos</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <HardDrive size={20} className="text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.disk_usage_mb.toFixed(1)} MB</p>
                  <p className="text-xs text-slate-400">Uso em disco</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <FileText size={20} className="text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.with_pdf_text}</p>
                  <p className="text-xs text-slate-400">PDFs com texto</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
                <Image size={20} className="text-cyan-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.with_ocr_text}</p>
                  <p className="text-xs text-slate-400">Imagens com OCR</p>
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-slate-400" />
              <span className="text-sm text-slate-300 font-medium">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Filtrar por tipo (ex: pdf, image)..."
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
              />
              <select
                value={hasOcr}
                onChange={(e) => setHasOcr(e.target.value as "" | "true" | "false")}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Com ou sem OCR</option>
                <option value="true">Com texto OCR</option>
                <option value="false">Sem OCR</option>
              </select>
            </div>
          </div>

          {/* Lista */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {attachments.length} anexo{attachments.length !== 1 ? "s" : ""}
              </h3>
            </div>
            {isLoading ? (
              <div className="py-10 text-center text-slate-400 text-sm">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Arquivo</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Tamanho</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                      <th className="px-4 py-3 text-center">OCR</th>
                      <th className="px-4 py-3 text-center">PDF Text</th>
                      <th className="px-4 py-3 text-center">Resumo IA</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                          Nenhum anexo encontrado
                        </td>
                      </tr>
                    )}
                    {attachments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getMimeIcon(a.file_type)}
                            <div className="min-w-0">
                              <div className="text-slate-200 truncate max-w-[200px]" title={a.original_filename}>
                                {a.original_filename}
                              </div>
                              {a.filename !== a.original_filename && (
                                <div className="text-slate-500 text-xs truncate max-w-[200px]">{a.filename}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getExtBadge(a.filename)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{humanFileSize(a.file_size)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {a.saved_at ? format(new Date(a.saved_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
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
                          <span className={a.has_ai_summary ? "text-blue-400 text-xs" : "text-slate-600 text-xs"}>
                            {a.has_ai_summary ? "✓" : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(a.has_pdf_text || a.has_ocr) && !a.has_ai_summary && (
                            <button
                              onClick={() => summarize.mutate(a.id)}
                              disabled={summarize.isPending}
                              title="Gerar resumo IA"
                              className="flex items-center gap-1 mx-auto text-xs text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                            >
                              <Sparkles size={12} />
                              Resumir
                            </button>
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
