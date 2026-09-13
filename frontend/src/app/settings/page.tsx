"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings, triggerCheck, triggerSummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle2, XCircle, RefreshCw, Send } from "lucide-react";

function IntegrationRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle2 size={14} /> Configurado
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <XCircle size={14} /> Não configurado
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
  const [busy, setBusy] = useState<"check" | "summary" | null>(null);

  async function handle(action: "check" | "summary") {
    setBusy(action);
    try {
      if (action === "check") await triggerCheck();
      else await triggerSummary();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {isLoading || !data ? (
            <div className="text-center text-slate-400 py-8">Carregando configurações...</div>
          ) : (
            <>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Sistema</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Aplicação</dt>
                      <dd className="text-slate-200">
                        {data.app_name} v{data.app_version}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Ambiente</dt>
                      <dd className="text-slate-200">{data.environment}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Intervalo de verificação</dt>
                      <dd className="text-slate-200">{data.check_interval_seconds}s</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Máx. e-mails por lote</dt>
                      <dd className="text-slate-200">{data.max_emails_per_batch}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Tamanho máx. de anexo</dt>
                      <dd className="text-slate-200">{data.max_attachment_size_mb} MB</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Modelo de IA</dt>
                      <dd className="text-slate-200">{data.claude_model}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Provedor WhatsApp</dt>
                      <dd className="text-slate-200">{data.whatsapp_provider}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Retenção de logs</dt>
                      <dd className="text-slate-200">{data.log_retention_days} dias</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Integrações</h3>
                  <IntegrationRow label="Outlook / Microsoft Graph" ok={data.integrations.outlook_configured} />
                  <IntegrationRow label="WhatsApp" ok={data.integrations.whatsapp_configured} />
                  <IntegrationRow label="Claude (IA)" ok={data.integrations.claude_configured} />
                  <div className="pt-3 mt-1 text-xs text-slate-500 space-y-1">
                    <p>Caixa monitorada: {data.integrations.email_address}</p>
                    <p>Destino WhatsApp: {data.integrations.whatsapp_to}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Palavras-chave de Prioridade</h3>
                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-red-400 font-medium mb-1.5">Crítico</p>
                    <p className="text-slate-400 leading-relaxed">
                      {data.priority_keywords.critical.join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-medium mb-1.5">Alto</p>
                    <p className="text-slate-400 leading-relaxed">
                      {data.priority_keywords.high.join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-medium mb-1.5">Médio</p>
                    <p className="text-slate-400 leading-relaxed">
                      {data.priority_keywords.medium.join(", ") || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Ações Manuais</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handle("check")}
                    disabled={busy !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                  >
                    <RefreshCw size={14} className={busy === "check" ? "animate-spin" : ""} />
                    Verificar e-mails agora
                  </button>
                  <button
                    onClick={() => handle("summary")}
                    disabled={busy !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                  >
                    <Send size={14} className={busy === "summary" ? "animate-pulse" : ""} />
                    Enviar resumo diário
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
