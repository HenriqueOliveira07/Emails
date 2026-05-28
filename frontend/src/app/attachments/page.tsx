"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllAttachments, AttachmentItem } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { FileText, Image, File, Archive, AlertTriangle, Brain, ScanText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx } from "clsx";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO", ALTO: "ALTO", MEDIO: "MÉDIO", BAIXO: "BAIXO",
};

function FileIcon({ type }: { type: string }) {
  if (type.includes("pdf")) return <FileText size={14} className="text-red-400" />;
  if (type.includes("image")) return <Image size={14} className="text-blue-400" />;
  if (type.includes("zip") || type.includes("archive")) return <Archive size={14} className="text-yellow-400" />;
  return <File size={14} className="text-slate-400" />;
}

export default function AttachmentsPage() {
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["all-attachments", offset],
    queryFn: () => fetchAllAttachments({ limit, offset }),
    refetchInterval: 60_000,
  });

  const attachments: AttachmentItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Total: <span className="text-white font-semibold">{total}</span> arquivos salvos
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Tamanho</th>
                    <th className="px-4 py-3 text-left">E-mail Origem</th>
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-center">Recursos</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td>
                    </tr>
                  )}
                  {!isLoading && attachments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Nenhum anexo salvo ainda
                      </td>
                    </tr>
                  )}
                  {attachments.map((att) => (
                    <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon type={att.file_type || ""} />
                          <div>
                            <p className="text-slate-200 text-xs font-medium truncate max-w-[200px]">
                              {att.filename}
                            </p>
                            {att.original_filename !== att.filename && (
                              <p className="text-slate-500 text-xs truncate max-w-[200px]">
                                Original: {att.original_filename}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {att.file_type?.split("/")[1]?.toUpperCase() || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{att.file_size_human}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 text-xs truncate max-w-[180px]">
                          {att.email_subject || "—"}
                        </p>
                        <p className="text-slate-500 text-xs truncate max-w-[180px]">
                          {att.email_sender || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {att.email_priority ? (
                          <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", `priority-badge-${att.email_priority}`)}>
                            {PRIORITY_LABEL[att.email_priority] || att.email_priority}
                          </span>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {att.saved_at
                          ? format(new Date(att.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {att.is_malicious && (
                            <span title="Arquivo suspeito">
                              <AlertTriangle size={14} className="text-red-400" />
                            </span>
                          )}
                          {att.has_ai_summary && (
                            <span title="Resumo IA disponível">
                              <Brain size={14} className="text-purple-400" />
                            </span>
                          )}
                          {att.has_ocr && (
                            <span title="Texto OCR extraído">
                              <ScanText size={14} className="text-blue-400" />
                            </span>
                          )}
                          {att.has_pdf_text && (
                            <span title="Texto PDF extraído">
                              <FileText size={14} className="text-green-400" />
                            </span>
                          )}
                          {!att.is_malicious && !att.has_ai_summary && !att.has_ocr && !att.has_pdf_text && (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300 transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-400">
                {total > 0 ? `${offset + 1}–${Math.min(offset + attachments.length, total)} de ${total}` : "0 resultados"}
              </span>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-lg text-slate-300 transition-colors"
              >
                Próxima →
              </button>
            </div>
          </div>

          {/* Legenda */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-300 mb-2">Legenda de ícones</p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Brain size={12} className="text-purple-400" /> Resumo por IA</span>
              <span className="flex items-center gap-1.5"><ScanText size={12} className="text-blue-400" /> OCR (texto de imagem)</span>
              <span className="flex items-center gap-1.5"><FileText size={12} className="text-green-400" /> Texto extraído de PDF</span>
              <span className="flex items-center gap-1.5"><AlertTriangle size={12} className="text-red-400" /> Arquivo suspeito</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Organização: <span className="font-mono text-slate-400">/Emails_Importantes/YYYY/MM/DD/Remetente/</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
