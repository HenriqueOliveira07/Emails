"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, MessageCircle, RefreshCw } from "lucide-react";
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

interface HealthStatus {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
}

function IntegrationRow({
  label, configured, detail,
}: {
  label: string; configured: boolean; detail?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        {detail && <p className="text-xs text-slate-400">{detail}</p>}
      </div>
      {configured ? (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <CheckCircle size={12} /> Configurado
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <XCircle size={12} /> Não configurado
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: health } = useQuery<HealthStatus>({
    queryKey: ["health-detail"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const triggerCheck = useMutation({
    mutationFn: () => api.post("/settings/trigger-check").then((r) => r.data),
    onSuccess: () => setTriggerMsg("Verificação de e-mails iniciada com sucesso!"),
    onError: () => setTriggerMsg("Erro ao iniciar verificação. Verifique o Celery Worker."),
  });

  const triggerSummary = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary").then((r) => r.data),
    onSuccess: () => setTriggerMsg("Resumo diário enviado com sucesso via WhatsApp!"),
    onError: () => setTriggerMsg("Erro ao enviar resumo diário."),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* System info */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Informações do Sistema</h3>
            {isLoading ? (
              <p className="text-slate-400 text-sm">Carregando...</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Aplicação", value: settings?.app_name ?? "—" },
                  { label: "Versão", value: settings?.app_version ?? "—" },
                  { label: "Ambiente", value: settings?.environment ?? "—" },
                  { label: "Modelo IA", value: settings?.claude_model ?? "—" },
                  {
                    label: "Intervalo de Verificação",
                    value: settings ? `${settings.check_interval_seconds}s` : "—",
                  },
                  {
                    label: "Máx. E-mails/Ciclo",
                    value: settings?.max_emails_per_batch ?? "—",
                  },
                  {
                    label: "Tamanho Máx. Anexo",
                    value: settings ? `${settings.max_attachment_size_mb} MB` : "—",
                  },
                  {
                    label: "Provedor WhatsApp",
                    value: settings?.whatsapp_provider?.toUpperCase() ?? "—",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className="text-sm text-white font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integrations */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
            {settings?.integrations && (
              <div>
                <IntegrationRow
                  label="Microsoft Outlook (Graph API)"
                  configured={settings.integrations.outlook_configured}
                  detail={settings.integrations.email_address}
                />
                <IntegrationRow
                  label="WhatsApp Business API"
                  configured={settings.integrations.whatsapp_configured}
                  detail={`Número destino: ${settings.integrations.whatsapp_to}`}
                />
                <IntegrationRow
                  label="Claude AI (Anthropic)"
                  configured={settings.integrations.claude_configured}
                  detail={settings?.claude_model}
                />
              </div>
            )}
          </div>

          {/* Service health */}
          {health && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">
                Saúde dos Serviços
                <span className={clsx(
                  "ml-2 text-xs font-normal",
                  health.overall === "ok" ? "text-green-400" : "text-red-400"
                )}>
                  {health.overall === "ok" ? "● Todos operacionais" : "● Degradado"}
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(health.services).map(([svc, info]) => (
                  <div
                    key={svc}
                    className={clsx(
                      "flex items-center justify-between p-3 rounded-lg border",
                      info.status === "ok"
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5"
                    )}
                  >
                    <span className="text-sm text-white capitalize">{svc}</span>
                    {info.status === "ok" ? (
                      <CheckCircle size={14} className="text-green-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Ações Manuais</h3>
            {triggerMsg && (
              <div className="mb-4 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                {triggerMsg}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => triggerCheck.mutate()}
                disabled={triggerCheck.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <RefreshCw size={14} className={triggerCheck.isPending ? "animate-spin" : ""} />
                {triggerCheck.isPending ? "Verificando..." : "Verificar E-mails Agora"}
              </button>
              <button
                onClick={() => triggerSummary.mutate()}
                disabled={triggerSummary.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <MessageCircle size={14} />
                {triggerSummary.isPending ? "Enviando..." : "Enviar Resumo Diário"}
              </button>
            </div>
          </div>

          {/* Keywords */}
          {settings?.priority_keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
              <div className="space-y-4">
                {[
                  { label: "CRÍTICO", key: "critical", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
                  { label: "ALTO", key: "high", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
                  { label: "MÉDIO", key: "medium", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
                ].map(({ label, key, cls }) => (
                  <div key={key}>
                    <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(settings.priority_keywords[key as keyof typeof settings.priority_keywords] ?? []).map(
                        (kw: string) => (
                          <span key={kw} className={clsx("px-2 py-0.5 rounded-md text-xs border", cls)}>
                            {kw}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
