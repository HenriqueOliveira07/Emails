"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings, triggerDailySummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle2, XCircle, Send } from "lucide-react";

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-slate-500">{detail}</span>}
        {ok ? (
          <CheckCircle2 size={16} className="text-green-400" />
        ) : (
          <XCircle size={16} className="text-red-400" />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  async function handleSendSummary() {
    setSending(true);
    setSentMsg(null);
    try {
      await triggerDailySummary();
      setSentMsg("Resumo diário disparado com sucesso.");
    } catch {
      setSentMsg("Falha ao disparar resumo diário.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-3xl">
          {isLoading || !data ? (
            <div className="text-center text-slate-400 py-8">Carregando configurações...</div>
          ) : (
            <>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Integrações</h3>
                <StatusRow
                  label="Microsoft Outlook / Graph"
                  ok={data.integrations.outlook_configured}
                  detail={data.integrations.email_address}
                />
                <StatusRow
                  label="WhatsApp"
                  ok={data.integrations.whatsapp_configured}
                  detail={`${data.whatsapp_provider} · ${data.integrations.whatsapp_to}`}
                />
                <StatusRow
                  label="Claude (Anthropic)"
                  ok={data.integrations.claude_configured}
                  detail={data.claude_model}
                />
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Sistema</h3>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-slate-400">Versão</dt>
                  <dd className="text-slate-200">{data.app_version}</dd>
                  <dt className="text-slate-400">Ambiente</dt>
                  <dd className="text-slate-200">{data.environment}</dd>
                  <dt className="text-slate-400">Intervalo de verificação</dt>
                  <dd className="text-slate-200">{data.check_interval_seconds}s</dd>
                  <dt className="text-slate-400">Máx. e-mails/lote</dt>
                  <dd className="text-slate-200">{data.max_emails_per_batch}</dd>
                  <dt className="text-slate-400">Tamanho máx. anexo</dt>
                  <dd className="text-slate-200">{data.max_attachment_size_mb} MB</dd>
                  <dt className="text-slate-400">Retenção de logs</dt>
                  <dd className="text-slate-200">{data.log_retention_days} dias</dd>
                </dl>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Palavras-chave de Prioridade</h3>
                {(["critical", "high", "medium"] as const).map((key) => (
                  <div key={key} className="mb-3 last:mb-0">
                    <p className="text-xs text-slate-500 uppercase mb-1.5">
                      {key === "critical" ? "Crítico" : key === "high" ? "Alto" : "Médio"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.priority_keywords[key].map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded-md text-xs bg-slate-700 text-slate-300"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Ações</h3>
                <button
                  onClick={handleSendSummary}
                  disabled={sending}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                >
                  <Send size={12} />
                  {sending ? "Enviando..." : "Enviar Resumo Diário Agora"}
                </button>
                {sentMsg && <p className="text-xs text-slate-400 mt-2">{sentMsg}</p>}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
