"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, Calendar } from "lucide-react";

interface Integration {
  outlook_configured: boolean;
  whatsapp_configured: boolean;
  claude_configured: boolean;
  email_address: string;
  whatsapp_to: string;
}

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
  integrations: Integration;
  priority_keywords: {
    critical: string[];
    high: string[];
    medium: string[];
  };
}

function IntegrationBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle size={16} className="text-green-400" />
      ) : (
        <XCircle size={16} className="text-red-400" />
      )}
      <span className={`text-sm ${ok ? "text-green-400" : "text-red-400"}`}>{label}</span>
    </div>
  );
}

function KeywordList({ keywords, color }: { keywords: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {keywords.map((kw) => (
        <span
          key={kw}
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
        >
          {kw}
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SystemSettings>("/settings").then((r) => r.data),
  });

  const triggerCheck = useMutation({
    mutationFn: () => api.post("/settings/trigger-check").then((r) => r.data),
  });

  const triggerSummary = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Configurações" />
          <main className="flex-1 p-6">
            <div className="text-center text-slate-400 py-12">Carregando configurações...</div>
          </main>
        </div>
      </div>
    );
  }

  const s = data!;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* System info */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Informações do Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Aplicação", value: s.app_name },
                { label: "Versão", value: s.app_version },
                { label: "Ambiente", value: s.environment },
                { label: "Intervalo de verificação", value: `${s.check_interval_seconds}s` },
                { label: "E-mails por ciclo", value: s.max_emails_per_batch },
                { label: "Tamanho máx. anexo", value: `${s.max_attachment_size_mb} MB` },
                { label: "Modelo IA", value: s.claude_model },
                { label: "Provedor WhatsApp", value: s.whatsapp_provider },
                { label: "Retenção de logs", value: `${s.log_retention_days} dias` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-white mt-0.5 font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
            <div className="space-y-3">
              <IntegrationBadge
                ok={s.integrations.outlook_configured}
                label={`Outlook / Microsoft Graph ${s.integrations.email_address !== "não configurado" ? `(${s.integrations.email_address})` : "(não configurado)"}`}
              />
              <IntegrationBadge
                ok={s.integrations.whatsapp_configured}
                label={`WhatsApp ${s.integrations.whatsapp_to !== "não configurado" ? `→ ${s.integrations.whatsapp_to}` : "(não configurado)"}`}
              />
              <IntegrationBadge
                ok={s.integrations.claude_configured}
                label={`Claude AI (${s.claude_model})`}
              />
            </div>
          </div>

          {/* Manual actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Ações Manuais</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => triggerCheck.mutate()}
                disabled={triggerCheck.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
              >
                <Play size={14} />
                {triggerCheck.isPending ? "Iniciando..." : "Verificar E-mails Agora"}
              </button>
              <button
                onClick={() => triggerSummary.mutate()}
                disabled={triggerSummary.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
              >
                <Calendar size={14} />
                {triggerSummary.isPending ? "Enviando..." : "Enviar Resumo Diário"}
              </button>
            </div>
            {triggerCheck.isSuccess && (
              <p className="text-xs text-green-400 mt-3">
                Verificação iniciada — acompanhe em Logs.
              </p>
            )}
            {triggerSummary.isSuccess && (
              <p className="text-xs text-green-400 mt-3">Resumo diário enviado via WhatsApp.</p>
            )}
          </div>

          {/* Keywords */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-red-400 uppercase tracking-wide">Crítico</p>
                <KeywordList
                  keywords={s.priority_keywords.critical}
                  color="bg-red-500/20 text-red-400 border border-red-500/20"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-orange-400 uppercase tracking-wide">Alto</p>
                <KeywordList
                  keywords={s.priority_keywords.high}
                  color="bg-orange-500/20 text-orange-400 border border-orange-500/20"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide">Médio</p>
                <KeywordList
                  keywords={s.priority_keywords.medium}
                  color="bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
                />
              </div>
            </div>
          </div>

          {/* Environment file guidance */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Configuração via .env</h3>
            <p className="text-xs text-slate-400 mb-3">
              Para modificar integrações e credenciais, edite o arquivo{" "}
              <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-300">.env</code> e
              reinicie os serviços com{" "}
              <code className="bg-slate-900 px-1.5 py-0.5 rounded text-green-300">
                docker compose up -d
              </code>
              .
            </p>
            <pre className="text-xs text-slate-400 bg-slate-900 rounded p-3 overflow-x-auto">
{`# Variáveis obrigatórias
OUTLOOK_CLIENT_ID=seu-client-id
OUTLOOK_CLIENT_SECRET=seu-secret
OUTLOOK_TENANT_ID=seu-tenant-id
OUTLOOK_EMAIL_ADDRESS=email@empresa.com

ANTHROPIC_API_KEY=sk-ant-...

WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
WHATSAPP_PHONE_NUMBER=+5511999999999
WHATSAPP_TO_NUMBER=+5511888888888`}
            </pre>
          </div>
        </main>
      </div>
    </div>
  );
}
