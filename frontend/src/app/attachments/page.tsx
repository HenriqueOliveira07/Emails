"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Image, Archive, File, FileSpreadsheet } from "lucide-react";

interface Attachment {
  id: number;
  email_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  saved_at: string | null;
  has_ocr: boolean;
  has_pdf_text: boolean;
  has_ai_summary: boolean;
  invoice_data: Record<string, string> | null;
  sender_email?: string;
  subject?: string;
}

function fileIcon(type: string) {
  if (type.includes("pdf")) return <FileText size={16} className="text-red-400" />;
  if (type.includes("image")) return <Image size={16} className="text-blue-400" />;
  if (type.includes("zip") || type.includes("archive")) return <Archive size={16} className="text-yellow-400" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv"))
    return <FileSpreadsheet size={16} className="text-green-400" />;
  return <File size={16} className="text-slate-400" />;
}

function humanSize(bytes: number): string {
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
  const { data, isLoading } = useQuery({
    queryKey: ["attachments-list"],
    queryFn: () =>
      api
        .get<{ items: Attachment[]; total: number }>("/emails/attachments?limit=200")
        .then((r) => r.data),
    refetchInterval: 60_000,
  });

  const attachments: Attachment[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalSize = attachments.reduce((acc, a) => acc + (a.file_size || 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Anexos Salvos" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total de arquivos", value: total, color: "text-blue-400" },
              { label: "Tamanho total", value: humanSize(totalSize), color: "text-purple-400" },
              {
                label: "Com extração OCR/PDF",
                value: attachments.filter((a) => a.has_ocr || a.has_pdf_text).length,
                color: "text-green-400",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center"
              >
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Attachment list */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Arquivos Salvos</h3>
            </div>

            {isLoading && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Arquivo</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Tamanho</th>
                    <th className="px-4 py-3 text-left">Salvo em</th>
                    <th className="px-4 py-3 text-left">Caminho</th>
                    <th className="px-4 py-3 text-center">OCR</th>
                    <th className="px-4 py-3 text-center">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && attachments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Nenhum anexo encontrado
                      </td>
                    </tr>
                  )}
                  {attachments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {fileIcon(a.file_type || "")}
                          <div>
                            <p className="text-slate-200 truncate max-w-[200px]">{a.filename}</p>
                            {a.original_filename !== a.filename && (
                              <p className="text-slate-500 text-xs truncate max-w-[200px]">
                                Original: {a.original_filename}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{a.file_type || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs text-right">
                        {humanSize(a.file_size)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {a.saved_at
                          ? format(new Date(a.saved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-slate-500 text-xs font-mono truncate block max-w-[260px]"
                          title={a.file_path}
                        >
                          {a.file_path}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.has_ocr ? (
                          <span className="text-xs text-green-400">✓</span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.has_pdf_text ? (
                          <span className="text-xs text-green-400">✓</span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tree path info */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Organização no Disco</h3>
            <pre className="text-xs text-slate-400 font-mono leading-relaxed">
{`/app/attachments/
└── Emails_Importantes/
    └── YYYY/
        └── MM/
            └── DD/
                └── NomeRemetente/
                    ├── documento.pdf
                    ├── planilha.xlsx
                    └── contrato_a1b2c3.docx`}
            </pre>
          </div>
        </main>
      </div>
    </div>
  );
}
