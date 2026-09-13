"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAttachments } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { FileText, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function AttachmentsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["attachments"],
    queryFn: () => fetchAttachments(100, 0),
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos" />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Anexos Salvos</h3>
              <span className="text-xs text-slate-400">{data?.total ?? 0} arquivo(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Remetente</th>
                    <th className="px-4 py-3 text-left">Assunto</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-right">Tamanho</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!isLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Nenhum anexo salvo ainda
                      </td>
                    </tr>
                  )}
                  {items.map((a) => (
                    <>
                      <tr
                        key={a.id}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-slate-200">
                            <FileText size={14} className="text-blue-400 shrink-0" />
                            <span className="truncate max-w-[220px]">{a.original_filename}</span>
                            {a.is_malicious && (
                              <ShieldAlert size={14} className="text-red-400 shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 truncate max-w-[180px]">
                          {a.sender_name || a.sender_email}
                        </td>
                        <td className="px-4 py-3 text-slate-400 truncate max-w-[220px]">{a.subject}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {a.saved_at ? format(new Date(a.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                          {formatSize(a.file_size)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expanded === a.id && (
                        <tr key={`${a.id}-detail`} className="bg-slate-900/50">
                          <td colSpan={6} className="px-6 py-4 text-xs text-slate-300 space-y-2">
                            <div>
                              <span className="text-slate-500 font-medium">Caminho: </span>
                              {a.file_path}
                            </div>
                            {a.ai_summary && (
                              <div>
                                <span className="text-slate-500 font-medium">Resumo IA: </span>
                                {a.ai_summary}
                              </div>
                            )}
                            {a.invoice_data && Object.keys(a.invoice_data).length > 0 && (
                              <div>
                                <span className="text-slate-500 font-medium">Dados extraídos: </span>
                                {JSON.stringify(a.invoice_data)}
                              </div>
                            )}
                            {!a.ai_summary && (!a.invoice_data || Object.keys(a.invoice_data).length === 0) && (
                              <div className="text-slate-500">Sem dados adicionais extraídos.</div>
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
