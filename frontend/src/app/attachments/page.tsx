"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Paperclip, FileText, Image, Archive, FileSpreadsheet,
  File, Shield, Search,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface AttachmentItem {
  id: number;
  email_id: number;
  sender_email: string;
  sender_name: string;
  email_subject: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_size_human: string;
  file_type: string;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, unknown> | null;
  is_malicious: boolean;
}

interface AttachmentStats {
  total_attachments: number;
  total_size_bytes: number;
  total_size_human: string;
  by_type: Record<string, number>;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (mimeType.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return <Archive size={16} className="text-yellow-400" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet size={16} className="text-green-400" />;
  return <File size={16} className="text-slate-400" />;
}

export default function AttachmentsPage() {
  const [sender, setSender] = useState("");
  const [fileType, setFileType] = useState("");

  const { data, isLoading } = useQuery<{ items: AttachmentItem[]; total: number }>({
    queryKey: ["attachments", sender, fileType],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" });
      if (sender) params.set("sender", sender);
      if (fileType) params.set("file_type", fileType);
      return api.get(`/attachments?${params}`).then((r) => r.data);
    },
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery<AttachmentStats>({
    queryKey: ["attachment-stats"],
    queryFn: () => api.get("/attachments/stats").then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Paperclip size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{stats?.total_attachments ?? "—"}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Archive size={16} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{stats?.total_size_human ?? "—"}</p>
                  <p className="text-xs text-slate-400">Armazenamento</p>
                </div>
              </div>
            </div>
            {Object.entries(stats?.by_type ?? {}).slice(0, 2).map(([type, count]) => (
              <div key={type} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-700 rounded-lg">
                    <FileIcon mimeType={type} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{count}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[100px]">{type.split("/")[1] || type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-40 space-y-1">
                <label className="text-xs text-slate-400 font-medium">Remetente</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Tipo de arquivo</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="pdf">PDF</option>
                  <option value="spreadsheet">Excel</option>
                  <option value="image">Imagens</option>
                  <option value="zip">ZIP</option>
                  <option value="xml">XML</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Arquivos Salvos</h3>
              <span className="text-xs text-slate-400">{data?.total ?? 0} arquivos</span>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">Carregando...</div>
            ) : data?.items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Nenhum anexo encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Arquivo</th>
                      <th className="px-4 py-3 text-left">Remetente</th>
                      <th className="px-4 py-3 text-left">E-mail</th>
                      <th className="px-4 py-3 text-right">Tamanho</th>
                      <th className="px-4 py-3 text-left">Salvo em</th>
                      <th className="px-4 py-3 text-center">IA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data?.items.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileIcon mimeType={att.file_type} />
                            <div>
                              <p className="text-slate-200 font-medium truncate max-w-[180px]">
                                {att.original_filename}
                              </p>
                              {att.is_malicious && (
                                <span className="text-xs text-red-400 flex items-center gap-1">
                                  <Shield size={10} /> Suspeito
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-300 text-xs truncate max-w-[140px]">
                            {att.sender_name || att.sender_email}
                          </p>
                          <p className="text-slate-500 text-xs truncate max-w-[140px]">{att.sender_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-400 text-xs truncate max-w-[200px]">{att.email_subject}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs whitespace-nowrap">
                          {att.file_size_human}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {att.saved_at
                            ? format(new Date(att.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {att.has_pdf_text && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">PDF</span>
                            )}
                            {att.has_ocr && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">OCR</span>
                            )}
                            {att.has_ai_summary && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">IA</span>
                            )}
                            {att.invoice_data && Object.keys(att.invoice_data).length > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">NF</span>
                            )}
                          </div>
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
