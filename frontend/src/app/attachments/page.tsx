"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAttachments, downloadAttachment, AttachmentItem } from "@/lib/api";
import { PageShell, Card, inputCls, fmtDate, Empty } from "@/components/Layout/PageShell";
import { Download, Receipt } from "lucide-react";

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const [sender, setSender] = useState("");
  const [fileType, setFileType] = useState("");
  const [page, setPage] = useState(1);
  const params: Record<string, string | number> = { page, page_size: 50 };
  if (sender) params.sender = sender;
  if (fileType) params.file_type = fileType;

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", params],
    queryFn: () => fetchAttachments(params),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <PageShell title="Anexos salvos">
      <Card
        title={`Anexos em /Emails_Importantes ${data ? `(${data.total})` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <input className={inputCls} placeholder="Remetente…" value={sender} onChange={(e) => { setSender(e.target.value); setPage(1); }} />
            <input className={inputCls} placeholder="Tipo (pdf, xml…)" value={fileType} onChange={(e) => { setFileType(e.target.value); setPage(1); }} />
          </div>
        }
      >
        {isLoading ? (
          <Empty text="Carregando…" />
        ) : !data?.items.length ? (
          <Empty text="Nenhum anexo salvo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Arquivo</th>
                  <th className="px-4 py-3 text-left">Remetente</th>
                  <th className="px-4 py-3 text-left">Recebido</th>
                  <th className="px-4 py-3 text-right">Tamanho</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a: AttachmentItem) => (
                  <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="text-slate-100 flex items-center gap-2">
                        {a.filename}
                        {a.has_invoice_data && (
                          <span title="Dados fiscais extraídos (boleto/NF)" className="text-emerald-400"><Receipt size={14} /></span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-md">{a.file_path}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{a.sender_email}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(a.received_at)}</td>
                    <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{fmtSize(a.file_size)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => downloadAttachment(a)} className="text-blue-400 hover:text-blue-300" title="Baixar">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex justify-end gap-2 px-5 py-3 text-sm text-slate-300">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">← Anterior</button>
            <span>{page}/{pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Próxima →</button>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
