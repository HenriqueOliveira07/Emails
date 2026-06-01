"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSettings, triggerCheck, triggerSummary, SystemSettings } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Zap, MessageCircle, Bot, Mail, Play, Send,
} from "lucide-react";
import { useState } from "react";

const IntegrationCard = ({
  label, configured, icon: Icon, detail,
}: {
  label: string;
  configured: boolean;
  icon: typeof CheckCircle;
  detail?: string;
}) => (
  <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 flex items-start gap-3">
    <div className={`p-2 rounded-lg ${configured ? "bg-green-500/20" : "bg-red-500/20"}`}>
      <Icon size={18} className={configured ? "text-green-400" : "text-red-400"} />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-white">{label}</p>
        {configured ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
            <CheckCircle size={10} /> Configurado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
            <XCircle size={10} /> Não configurado
          </span>
        )}
      </div>
      {detail && <p className="text-xs text-slate-400 mt-0.5">{detail}</p>}
    </div>
  </div>
);

const KeywordList = ({ title, keywords, color }: { title: string; keywords: string[]; color: string }) => (
  <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4">
    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>{title}</h4>
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw) => (
        <span key={kw} className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-md">
          {kw}
        </span>
      ))}
    </div>
  </div>
);

export default function SettingsPage() {
  const qc = useQueryClient();
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  async function handleTriggerCheck() {
    try {
      const result = await triggerCheck();
      setTriggerResult(`Tarefa iniciada: ${result.task_id}`);
      setTimeout(() => setTriggerResult(null), 5000);
    } catch {
      setTriggerResult("Erro ao iniciar verificação");
    }
  }

  async function handleTriggerSummary() {
    try {
      const result = await triggerSummary();
      setSummaryResult(`Resumo enviado: ${result.task_id}`);
      setTimeout(() => setSummaryResult(null), 5000);
    } catch {
      setSummaryResult("Erro ao enviar resumo");
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-slate-400 py-12">Carregando configurações...</div>
          ) : settings ? (
            <>
              {/* System Info */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Informações do Sistema</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Versão", value: settings.app_version },
                    { label: "Ambiente", value: settings.environment },
                    { label: "Intervalo de verificação", value: `${settings.check_interval_seconds}s` },
                    { label: "E-mails por ciclo", value: settings.max_emails_per_batch },
                    { label: "Tamanho máx. anexo", value: `${settings.max_attachment_size_mb} MB` },
                    { label: "Modelo de IA", value: settings.claude_model },
                    { label: "Provedor WhatsApp", value: settings.whatsapp_provider },
                    { label: "Retenção de logs", value: `${settings.log_retention_days} dias` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrations */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <IntegrationCard
                    label="Microsoft Outlook 365"
                    configured={settings.integrations.outlook_configured}
                    icon={Mail}
                    detail={settings.integrations.email_address}
                  />
                  <IntegrationCard
                    label="WhatsApp Business API"
                    configured={settings.integrations.whatsapp_configured}
                    icon={MessageCircle}
                    detail={settings.integrations.whatsapp_to}
                  />
                  <IntegrationCard
                    label="Claude AI (Anthropic)"
                    configured={settings.integrations.claude_configured}
                    icon={Bot}
                    detail={settings.claude_model}
                  />
                  <IntegrationCard
                    label="Sistema"
                    configured={true}
                    icon={Zap}
                    detail={`v${settings.app_version} — ${settings.environment}`}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Ações Manuais</h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={handleTriggerCheck}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
                    >
                      <Play size={14} />
                      Verificar E-mails Agora
                    </button>
                    {triggerResult && (
                      <p className="text-xs text-green-400">{triggerResult}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={handleTriggerSummary}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
                    >
                      <Send size={14} />
                      Enviar Resumo Diário
                    </button>
                    {summaryResult && (
                      <p className="text-xs text-green-400">{summaryResult}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Keywords */}
              {settings.priority_keywords && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
                  <div className="space-y-3">
                    <KeywordList
                      title="CRÍTICO"
                      keywords={settings.priority_keywords.critical}
                      color="text-red-400"
                    />
                    <KeywordList
                      title="ALTO"
                      keywords={settings.priority_keywords.high}
                      color="text-orange-400"
                    />
                    <KeywordList
                      title="MÉDIO"
                      keywords={settings.priority_keywords.medium}
                      color="text-yellow-400"
                    />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
