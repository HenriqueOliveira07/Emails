"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSettings, fetchKeywords, triggerCheck, triggerDailySummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Play, Send, RefreshCw, Tag,
} from "lucide-react";
import { clsx } from "clsx";

function IntegrationRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      <span className={clsx("flex items-center gap-1 text-xs font-medium", ok ? "text-green-400" : "text-red-400")}>
        {ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
        {ok ? "Configurado" : "Não configurado"}
      </span>
    </div>
  );
}

function KeywordList({ keywords }: { keywords: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {keywords.map((kw) => (
        <span key={kw} className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-300">
          <Tag size={9} />
          {kw}
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [checkMsg, setCheckMsg] = useState("");
  const [summaryMsg, setSummaryMsg] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 60_000,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
    staleTime: 60_000,
  });

  const triggerCheckMutation = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => setCheckMsg(data.message),
    onError: () => setCheckMsg("Erro ao disparar verificação"),
  });

  const triggerSummaryMutation = useMutation({
    mutationFn: triggerDailySummary,
    onSuccess: (data) => setSummaryMsg(data.message),
    onError: () => setSummaryMsg("Erro ao enviar resumo"),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {isLoading && (
            <div className="text-center text-slate-400 py-8">
              <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
              Carregando configurações...
            </div>
          )}

          {settings && (
            <>
              {/* App info */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Informações do Sistema</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {[
                    ["Aplicação", settings.app_name],
                    ["Versão", settings.app_version],
                    ["Ambiente", settings.environment],
                    ["Modelo IA", settings.claude_model],
                    ["Provedor WhatsApp", settings.whatsapp_provider],
                    ["Intervalo de verificação", `${settings.check_interval_seconds}s`],
                    ["Máx. e-mails por ciclo", settings.max_emails_per_batch.toString()],
                    ["Tamanho máx. anexo", `${settings.max_attachment_size_mb} MB`],
                    ["Retenção de logs", `${settings.log_retention_days} dias`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-slate-200 font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrations */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Status das Integrações</h2>
                <IntegrationRow
                  label="Microsoft Outlook / Azure AD"
                  ok={settings.integrations.outlook_configured}
                  detail={settings.integrations.email_address !== "não configurado"
                    ? settings.integrations.email_address : undefined}
                />
                <IntegrationRow
                  label="WhatsApp"
                  ok={settings.integrations.whatsapp_configured}
                  detail={settings.integrations.whatsapp_to !== "não configurado"
                    ? `Notifica: ${settings.integrations.whatsapp_to}` : undefined}
                />
                <IntegrationRow
                  label="Claude AI (Anthropic)"
                  ok={settings.integrations.claude_configured}
                  detail={`Modelo: ${settings.claude_model}`}
                />
              </div>

              {/* Actions */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4">Ações Manuais</h2>
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => triggerCheckMutation.mutate()}
                      disabled={triggerCheckMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                    >
                      <Play size={13} className={triggerCheckMutation.isPending ? "animate-pulse" : ""} />
                      {triggerCheckMutation.isPending ? "Verificando..." : "Verificar E-mails Agora"}
                    </button>
                    {checkMsg && (
                      <p className="text-xs text-green-400">{checkMsg}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => triggerSummaryMutation.mutate()}
                      disabled={triggerSummaryMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                    >
                      <Send size={13} className={triggerSummaryMutation.isPending ? "animate-pulse" : ""} />
                      {triggerSummaryMutation.isPending ? "Enviando..." : "Enviar Resumo Diário"}
                    </button>
                    {summaryMsg && (
                      <p className="text-xs text-green-400">{summaryMsg}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Keywords */}
              {keywords && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4">Palavras-Chave de Prioridade</h2>
                  <div className="space-y-4">
                    {[
                      { key: "CRITICO", label: "Crítico", color: "text-red-400 border-red-500/30 bg-red-500/10" },
                      { key: "ALTO", label: "Alto", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
                      { key: "MEDIO", label: "Médio", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
                      { key: "spam", label: "Spam/Ignorar", color: "text-slate-400 border-slate-500/30 bg-slate-500/10" },
                    ].map(({ key, label, color }) => (
                      <div key={key}>
                        <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded border", color)}>
                          {label}
                        </span>
                        <KeywordList keywords={(keywords[key] as string[]) ?? []} />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    Para alterar palavras-chave, edite as variáveis de ambiente no arquivo .env e reinicie o sistema.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
