"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Settings, CheckCircle, XCircle, Play, RefreshCw, Mail, MessageCircle, Brain, Database } from "lucide-react";
import { clsx } from "clsx";

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

interface HealthData {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
}

function IntegrationBadge({ configured, label }: { configured: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {configured ? (
        <CheckCircle size={14} className="text-green-400 shrink-0" />
      ) : (
        <XCircle size={14} className="text-red-400 shrink-0" />
      )}
      <span className={clsx("text-sm", configured ? "text-green-400" : "text-red-400")}>
        {label}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: health } = useQuery<HealthData>({
    queryKey: ["health-detail"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: () => api.get("/settings/keywords").then((r) => r.data),
  });

  async function triggerCheck() {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await api.post("/settings/trigger-check");
      setTriggerResult(`Iniciado — Task ID: ${res.data.task_id}`);
    } catch {
      setTriggerResult("Erro ao iniciar verificação.");
    } finally {
      setTriggering(false);
    }
  }

  async function triggerSummary() {
    setSummaryLoading(true);
    setSummaryResult(null);
    try {
      const res = await api.post("/settings/trigger-summary");
      setSummaryResult(`Iniciado — Task ID: ${res.data.task_id}`);
    } catch {
      setSummaryResult("Erro ao enviar resumo.");
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Status das integrações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle size={14} />
              Status das Integrações
            </h3>
            {isLoading ? (
              <p className="text-slate-400 text-sm">Carregando...</p>
            ) : settings ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
                    <Mail size={12} />
                    E-mail
                  </div>
                  <IntegrationBadge
                    configured={settings.integrations.outlook_configured}
                    label="Outlook / Microsoft Graph API"
                  />
                  <div className="text-xs text-slate-500 ml-6">
                    Conta: {settings.integrations.email_address}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
                    <MessageCircle size={12} />
                    WhatsApp
                  </div>
                  <IntegrationBadge
                    configured={settings.integrations.whatsapp_configured}
                    label={`WhatsApp (${settings.whatsapp_provider})`}
                  />
                  <div className="text-xs text-slate-500 ml-6">
                    Destino: {settings.integrations.whatsapp_to}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
                    <Brain size={12} />
                    IA
                  </div>
                  <IntegrationBadge
                    configured={settings.integrations.claude_configured}
                    label={`Claude API (${settings.claude_model})`}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
                    <Database size={12} />
                    Infraestrutura
                  </div>
                  {health?.services && Object.entries(health.services).map(([name, svc]) => (
                    <IntegrationBadge
                      key={name}
                      configured={svc.status === "ok"}
                      label={name.toUpperCase()}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Parâmetros do sistema */}
          {settings && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Settings size={14} />
                Parâmetros do Sistema
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                  { label: "Versão", value: `${settings.app_name} v${settings.app_version}` },
                  { label: "Ambiente", value: settings.environment },
                  { label: "Intervalo de verificação", value: `${settings.check_interval_seconds}s` },
                  { label: "E-mails por ciclo (máx)", value: String(settings.max_emails_per_batch) },
                  { label: "Tamanho máx. de anexo", value: `${settings.max_attachment_size_mb} MB` },
                  { label: "Retenção de logs", value: `${settings.log_retention_days} dias` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                    <span className="text-xs text-slate-400">{item.label}</span>
                    <span className="text-xs text-slate-200 font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Play size={14} />
              Ações Manuais
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={triggerCheck}
                  disabled={triggering}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <RefreshCw size={14} className={triggering ? "animate-spin" : ""} />
                  {triggering ? "Iniciando..." : "Verificar E-mails Agora"}
                </button>
                {triggerResult && (
                  <span className="text-xs text-green-400">{triggerResult}</span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Dispara uma verificação imediata dos e-mails não lidos (normalmente ocorre a cada {settings?.check_interval_seconds || 60}s).
              </p>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={triggerSummary}
                    disabled={summaryLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                  >
                    <MessageCircle size={14} className={summaryLoading ? "animate-pulse" : ""} />
                    {summaryLoading ? "Enviando..." : "Enviar Resumo Diário (WhatsApp)"}
                  </button>
                  {summaryResult && (
                    <span className="text-xs text-green-400">{summaryResult}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Envia agora o resumo diário via WhatsApp (normalmente ocorre todos os dias às 8h).
                </p>
              </div>
            </div>
          </div>

          {/* Palavras-chave */}
          {keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Palavras-Chave de Prioridade</h3>
              <div className="space-y-4">
                {[
                  { label: "CRÍTICO", key: "CRITICO", color: "bg-red-500/20 text-red-400 border-red-500/30" },
                  { label: "ALTO", key: "ALTO", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
                  { label: "MÉDIO", key: "MEDIO", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
                  { label: "SPAM (ignorar)", key: "spam", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
                ].map(({ label, key, color }) => (
                  <div key={key}>
                    <p className={clsx("text-xs font-medium px-2 py-0.5 rounded-md border inline-block mb-2", color)}>
                      {label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(keywords[key] || []).map((kw: string) => (
                        <span
                          key={kw}
                          className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Palavras-chave configuradas via variáveis de ambiente. Edite o arquivo <code className="bg-slate-700 px-1 rounded">.env</code> para personalizar.
              </p>
            </div>
          )}

          {/* Endpoints da API */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Documentação da API</h3>
            <div className="space-y-2 font-mono text-xs">
              {[
                ["GET", "/api/dashboard/stats", "Estatísticas do dia"],
                ["GET", "/api/dashboard/recent-emails", "E-mails recentes"],
                ["GET", "/api/dashboard/health", "Saúde das integrações"],
                ["GET", "/api/emails", "Listar e-mails (com filtros)"],
                ["POST", "/api/emails/{id}/reclassify", "Re-classificar com IA"],
                ["GET", "/api/attachments", "Listar anexos"],
                ["GET", "/api/notifications", "Histórico de notificações"],
                ["POST", "/api/notifications/manual", "Enviar notificação manual"],
                ["POST", "/api/settings/trigger-check", "Disparar verificação"],
                ["POST", "/api/settings/trigger-summary", "Enviar resumo diário"],
              ].map(([method, path, desc]) => (
                <div key={path} className="flex items-center gap-3 py-1.5 border-b border-slate-700/30">
                  <span className={clsx("text-xs font-bold w-12 shrink-0",
                    method === "GET" ? "text-green-400" :
                    method === "POST" ? "text-blue-400" :
                    "text-yellow-400"
                  )}>
                    {method}
                  </span>
                  <span className="text-slate-300">{path}</span>
                  <span className="text-slate-500 text-xs ml-auto hidden lg:block">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Documentação interativa completa em:{" "}
              <span className="text-blue-400 font-mono">http://localhost:8000/api/docs</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
