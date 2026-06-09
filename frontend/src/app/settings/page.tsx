"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, PlayCircle, Mail, MessageCircle,
  Brain, Database, RefreshCw, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

interface SystemSettings {
  app_name: string;
  app_version: string;
  environment: string;
  check_interval_seconds: number;
  max_emails_per_batch: number;
  max_attachment_size_mb: number;
  claude_model: string;
  whatsapp_provider: string;
  log_retention_days: number;
  integrations: {
    outlook_configured: boolean;
    whatsapp_configured: boolean;
    claude_configured: boolean;
    email_address: string;
    whatsapp_to: string;
  };
  priority_keywords: {
    critical: string[];
    high: string[];
    medium: string[];
  };
}

const fetchSettings = (): Promise<SystemSettings> =>
  api.get("/settings").then((r) => r.data);

const triggerSummary = () =>
  api.post("/settings/trigger-summary").then((r) => r.data);

const triggerCheck = () =>
  api.post("/settings/trigger-check").then((r) => r.data);

function IntegrationRow({
  icon: Icon,
  label,
  configured,
  detail,
}: {
  icon: typeof CheckCircle;
  label: string;
  configured: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={clsx("p-1.5 rounded-lg", configured ? "bg-green-500/20" : "bg-red-500/20")}>
          <Icon size={14} className={configured ? "text-green-400" : "text-red-400"} />
        </div>
        <div>
          <p className="text-sm text-white">{label}</p>
          <p className="text-xs text-slate-400">{detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {configured ? (
          <CheckCircle size={14} className="text-green-400" />
        ) : (
          <XCircle size={14} className="text-red-400" />
        )}
        <span className={clsx("text-xs", configured ? "text-green-400" : "text-red-400")}>
          {configured ? "Configurado" : "Não configurado"}
        </span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    refetchInterval: 60_000,
  });

  const checkMutation = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (d) => setCheckResult(`Tarefa iniciada (ID: ${d.task_id})`),
    onError: () => setCheckResult("Erro ao iniciar verificação."),
  });

  const summaryMutation = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (d) => setSummaryResult(`Resumo iniciado (ID: ${d.task_id})`),
    onError: () => setSummaryResult("Erro ao iniciar resumo."),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Configurações" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Carregando configurações...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* App Info */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Informações do Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Versão", value: settings?.app_version },
                { label: "Ambiente", value: settings?.environment },
                { label: "Modelo IA", value: settings?.claude_model },
                { label: "WhatsApp", value: settings?.whatsapp_provider },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm text-white font-medium mt-0.5">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Status das Integrações</h3>
            <p className="text-xs text-slate-500 mb-4">Configure as variáveis de ambiente no arquivo .env</p>
            <IntegrationRow
              icon={Mail}
              label="Microsoft Outlook (Graph API)"
              configured={settings?.integrations.outlook_configured ?? false}
              detail={settings?.integrations.email_address || "não configurado"}
            />
            <IntegrationRow
              icon={MessageCircle}
              label="WhatsApp Business API"
              configured={settings?.integrations.whatsapp_configured ?? false}
              detail={settings?.integrations.whatsapp_to || "não configurado"}
            />
            <IntegrationRow
              icon={Brain}
              label="Claude (Anthropic AI)"
              configured={settings?.integrations.claude_configured ?? false}
              detail={settings?.claude_model || "claude-sonnet-4-6"}
            />
            <IntegrationRow
              icon={Database}
              label="PostgreSQL"
              configured
              detail="Conexão ativa via SQLAlchemy"
            />
          </div>

          {/* Processing config */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Configurações de Processamento</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Clock,
                  label: "Intervalo de Verificação",
                  value: `${settings?.check_interval_seconds}s`,
                },
                {
                  icon: Mail,
                  label: "E-mails por Ciclo",
                  value: String(settings?.max_emails_per_batch),
                },
                {
                  icon: Database,
                  label: "Tamanho Máx. Anexo",
                  value: `${settings?.max_attachment_size_mb} MB`,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-3">
                  <Icon size={16} className="text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm text-white font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Ações Manuais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-xs font-medium text-slate-300 mb-2">Verificar E-mails Agora</h4>
                <p className="text-xs text-slate-500 mb-3">
                  Dispara imediatamente um ciclo de verificação de novos e-mails no Outlook.
                </p>
                {checkResult && (
                  <p className="text-xs text-green-400 mb-2">{checkResult}</p>
                )}
                <button
                  onClick={() => { setCheckResult(null); checkMutation.mutate(); }}
                  disabled={checkMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                >
                  <RefreshCw size={12} className={checkMutation.isPending ? "animate-spin" : ""} />
                  {checkMutation.isPending ? "Iniciando..." : "Verificar Agora"}
                </button>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-xs font-medium text-slate-300 mb-2">Enviar Resumo Diário</h4>
                <p className="text-xs text-slate-500 mb-3">
                  Envia imediatamente o resumo diário de e-mails processados via WhatsApp.
                </p>
                {summaryResult && (
                  <p className="text-xs text-green-400 mb-2">{summaryResult}</p>
                )}
                <button
                  onClick={() => { setSummaryResult(null); summaryMutation.mutate(); }}
                  disabled={summaryMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                >
                  <PlayCircle size={12} />
                  {summaryMutation.isPending ? "Enviando..." : "Enviar Resumo"}
                </button>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Palavras-chave de Prioridade</h3>
            <div className="space-y-4">
              {settings?.priority_keywords && Object.entries({
                critical: { label: "CRÍTICO", color: "text-red-400 bg-red-500/20 border-red-500/30" },
                high: { label: "ALTO", color: "text-orange-400 bg-orange-500/20 border-orange-500/30" },
                medium: { label: "MÉDIO", color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30" },
              }).map(([key, { label, color }]) => (
                <div key={key}>
                  <p className={clsx("text-xs font-medium mb-2 px-2 py-0.5 rounded-md border inline-block", color)}>
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(settings.priority_keywords[key as keyof typeof settings.priority_keywords] || []).map((kw) => (
                      <span
                        key={kw}
                        className="text-xs bg-slate-700 border border-slate-600 text-slate-300 px-2 py-0.5 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
