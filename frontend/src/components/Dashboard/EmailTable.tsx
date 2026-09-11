"use client";
import { Fragment } from "react";
import { EmailItem } from "@/lib/api";
import { Paperclip, MessageCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
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

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">E-mails Recentes</h3>
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
              <th className="px-4 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {emails.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Nenhum e-mail encontrado
                </td>
              </tr>
            )}
            {emails.map((email) => (
              <Fragment key={email.id}>
                <tr
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                >
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-md text-xs font-medium", `priority-badge-${email.priority}`)}>
                      {PRIORITY_LABEL[email.priority] || email.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium truncate max-w-[160px]">
                      {email.sender_name || email.sender_email}
                    </div>
                    <div className="text-slate-400 text-xs truncate max-w-[160px]">{email.sender_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200 truncate max-w-[240px] flex items-center gap-1">
                      {email.action_required && <AlertCircle size={12} className="text-orange-400 shrink-0" />}
                      {email.subject}
                    </div>
                    <div className="text-slate-500 text-xs truncate max-w-[240px]">{email.category}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
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
                  <td className="px-4 py-3 text-center text-slate-400">
                    {expanded === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </td>
                </tr>
                {expanded === email.id && (
                  <tr key={`${email.id}-detail`} className="bg-slate-900/50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="text-xs text-slate-300 leading-relaxed">
                        <span className="text-slate-500 font-medium">Resumo IA: </span>
                        {email.ai_summary || email.body_preview || "Sem resumo disponível"}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
