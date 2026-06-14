"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Paperclip, RefreshCw, FileText, Image, Archive, Table } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AttachmentItem {
  id: number;
  email_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  saved_at: string;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: string;
  invoice_data: Record<string, unknown>;
  sender_email?: string;
  subject?: string;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.includes("pdf")) return <FileText size={14} className="text-red-400" />;
  if (mime.includes("image")) return <Image size={14} className="text-blue-400" />;
  if (mime.includes("zip") || mime.includes("compressed")) return <Archive size={14} className="text-yellow-400" />;
  if (mime.includes("sheet") || mime.includes("csv")) return <Table size={14} className="text-green-400" />;
  return <Paperclip size={14} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const [limit, setLimit] = useState(50);
  const [fileType, setFileType] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attachments", limit, fileType],
    queryFn: () =>
      api.get("/attachments", { params: { limit, file_type: fileType || undefined } }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const attachments: AttachmentItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalSize: number = data?.total_size_bytes ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-xs text-slate-400 mt-1">Total de anexos</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-400">{humanSize(totalSize)}</p>
              <p className="text-xs text-slate-400 mt-1">Espaço utilizado</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-400">
                {attachments.filter((a) => a.has_pdf_text || a.has_ocr).length}
              </p>
              <p className="text-xs text-slate-400 mt-1">Com extração de texto</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos os tipos</option>
                <option value="pdf">PDF</option>
                <option value="excel">Excel (XLSX/XLS)</option>
                <option value="word">Word (DOCX/DOC)</option>
                <option value="image">Imagens</option>
                <option value="csv">CSV</option>
                <option value="zip">ZIP</option>
                <option value="xml">XML</option>
              </select>

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value={25}>25 registros</option>
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
              </select>

              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
              >
                <RefreshCw size={12} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Lista de anexos */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">
                {isLoading ? "Carregando..." : `${attachments.length} de ${total} anexo(s)`}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">E-mail / Remetente</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Tamanho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-center">Extração</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Carregando anexos...
                      </td>
                    </tr>
                  )}
                  {!isLoading && attachments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Nenhum anexo encontrado
                      </td>
                    </tr>
                  )}
                  {attachments.map((att) => (
                    <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon mime={att.file_type} />
                          <div>
                            <p className="text-slate-200 font-medium truncate max-w-[200px]">
                              {att.filename}
                            </p>
                            {att.original_filename !== att.filename && (
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                Original: {att.original_filename}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {att.sender_email ? (
                          <>
                            <p className="text-slate-300 text-xs truncate max-w-[160px]">{att.sender_email}</p>
                            {att.subject && (
                              <p className="text-slate-500 text-xs truncate max-w-[160px]">{att.subject}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-600">E-mail #{att.email_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{att.file_type || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-slate-400">{humanSize(att.file_size || 0)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">
                          {att.saved_at
                            ? format(new Date(att.saved_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {att.has_pdf_text && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">PDF</span>
                          )}
                          {att.has_ocr && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">OCR</span>
                          )}
                          {!att.has_pdf_text && !att.has_ocr && (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Organização de pastas */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Estrutura de Armazenamento</h3>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-400 space-y-1">
              <p className="text-slate-300">/app/attachments/</p>
              <p className="ml-4 text-slate-400">└── 2026/</p>
              <p className="ml-8 text-slate-400">└── 06/</p>
              <p className="ml-12 text-slate-400">└── 14/</p>
              <p className="ml-16 text-slate-400">└── Remetente_Empresa/</p>
              <p className="ml-20 text-slate-500">├── boleto_junho.pdf</p>
              <p className="ml-20 text-slate-500">├── contrato_fornecedor.docx</p>
              <p className="ml-20 text-slate-500">└── nota_fiscal_123.xml</p>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Organizado automaticamente por: Ano / Mês / Dia / Remetente
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
