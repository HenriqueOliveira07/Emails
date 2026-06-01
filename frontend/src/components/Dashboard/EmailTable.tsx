"use client";
import { EmailItem, reclassifyEmail } from "@/lib/api";
import { Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Clock } from "lucide-react";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const PRIORITY_LABEL: Record<string, string> = {
  CRITICO: "CRÍTICO",
  ALTO: "ALTO",
  MEDIO: "MÉDIO",
  BAIXO: "BAIXO",
};

interface EmailTableProps {
  emails: EmailItem[];
}

export function EmailTable({ emails }: EmailTableProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reclassifying, setReclassifying] = useState<number | null>(null);

  async function handleReclassify(e: React.MouseEvent, emailId: number) {
    e.stopPropagation();
    setReclassifying(emailId);
    try {
      await reclassifyEmail(emailId);
      window.location.reload();
    } finally {
      setReclassifying(null);
    }
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">E-mails Recentes</h3>
        <span className="text-xs text-slate-400">{emails.length} registro(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Prioridade</th>
              <th className="px-4 py-3 text-left">Remetente</th>
              <th className="px-4 py-3 text-left">Assunto</th>
              <th className="px-4 py-3 text-left">Horário</th>
              <th className="px-4 py-3 text-center">Anexos</th>
              <th className="px-4 py-3 text-center">WhatsApp</th>
              <th className="px-4 py-3 text-center">IA</th>
              <th className="px-4 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Nenhum e-mail encontrado
                </td>
              </tr>
            )}
            {emails.map((email) => (
              <>
                <tr
                  key={email.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                >
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", `priority-badge-${email.priority}`)}>
                      {PRIORITY_LABEL[email.priority] || email.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium truncate max-w-[160px] text-xs">
                      {email.sender_name || email.sender_email}
                    </div>
                    <div className="text-slate-400 text-xs truncate max-w-[160px]">{email.sender_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200 text-xs truncate max-w-[240px] flex items-center gap-1">
                      {email.action_required && <AlertCircle size={11} className="text-orange-400 shrink-0" />}
                      {email.subject}
                    </div>
                    <div className="text-slate-500 text-xs truncate max-w-[240px]">{email.category}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {email.received_at
                      ? format(new Date(email.received_at), "dd/MM HH:mm", { locale: ptBR })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {email.has_attachments ? (
                      <span className="flex items-center justify-center gap-1 text-blue-400">
                        <Paperclip size={12} />
                        <span className="text-xs">{email.attachment_count}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {email.whatsapp_sent ? (
                      <MessageCircle size={14} className="text-green-400 mx-auto" />
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => handleReclassify(e, email.id)}
                      disabled={reclassifying === email.id}
                      title="Re-classificar com IA"
                      className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                    >
                      {reclassifying === email.id ? (
                        <Clock size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400">
                    {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </td>
                </tr>
                {expanded === email.id && (
                  <tr key={`${email.id}-detail`} className="bg-slate-900/60">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 font-medium mb-1">Resumo IA</p>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                          </p>
                        </div>
                        <div className="space-y-2 text-xs text-slate-400">
                          {email.processing_time_ms && (
                            <p>Processado em: <span className="text-white">{Math.round(email.processing_time_ms)}ms</span></p>
                          )}
                          {email.whatsapp_sent_at && (
                            <p>WhatsApp enviado: <span className="text-white">
                              {format(new Date(email.whatsapp_sent_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span></p>
                          )}
                          {email.action_required && (
                            <p className="text-orange-400">Requer ação imediata</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
