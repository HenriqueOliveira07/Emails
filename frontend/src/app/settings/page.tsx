"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, Calendar } from "lucide-react";

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

function IntegrationRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div>
        <span className="text-sm text-slate-200">{label}</span>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      {ok ? (
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

function ServiceRow({ name, status, error }: { name: string; status: string; error?: string }) {
  const ok = status === "ok";
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div>
        <span className="text-sm text-slate-200 capitalize">{name}</span>
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
      </div>
      <span className={`flex items-center gap-1 text-xs ${ok ? "text-green-400" : "text-red-400"}`}>
        {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
        {ok ? "Online" : "Erro"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["system-settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: health } = useQuery<HealthStatus>({
    queryKey: ["health-detail"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const triggerCheck = useMutation({
    mutationFn: () => api.post("/settings/trigger-check").then((r) => r.data),
  });

  const triggerSummary = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary").then((r) => r.data),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Quick Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Ações Rápidas</h3>
            <div className="flex gap-3">
              <button
                onClick={() => triggerCheck.mutate()}
                disabled={triggerCheck.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white text-sm transition-colors"
              >
                <Play size={14} />
                {triggerCheck.isPending ? "Iniciando..." : "Verificar E-mails Agora"}
              </button>
              <button
                onClick={() => triggerSummary.mutate()}
                disabled={triggerSummary.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white text-sm transition-colors"
              >
                <Calendar size={14} />
                {triggerSummary.isPending ? "Enviando..." : "Enviar Resumo Diário"}
              </button>
            </div>
            {triggerCheck.data && (
              <p className="text-xs text-green-400 mt-2">
                Tarefa iniciada: {triggerCheck.data.task_id}
              </p>
            )}
            {triggerSummary.data && (
              <p className="text-xs text-green-400 mt-2">
                Resumo agendado: {triggerSummary.data.task_id}
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* System Info */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Configurações do Sistema</h3>
              {settings && (
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Versão", value: settings.app_version },
                    { label: "Ambiente", value: settings.environment },
                    { label: "Intervalo de verificação", value: `${settings.check_interval_seconds}s` },
                    { label: "E-mails por ciclo", value: settings.max_emails_per_batch },
                    { label: "Tamanho máx. anexo", value: `${settings.max_attachment_size_mb}MB` },
                    { label: "Modelo Claude", value: settings.claude_model },
                    { label: "Provedor WhatsApp", value: settings.whatsapp_provider },
                    { label: "Retenção de logs", value: `${settings.log_retention_days} dias` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-200 font-mono text-xs">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Integrations */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
              {settings && (
                <div>
                  <IntegrationRow
                    label="Microsoft Outlook / Azure AD"
                    ok={settings.integrations.outlook_configured}
                    detail={settings.integrations.email_address}
                  />
                  <IntegrationRow
                    label="WhatsApp Business API"
                    ok={settings.integrations.whatsapp_configured}
                    detail={settings.integrations.whatsapp_to}
                  />
                  <IntegrationRow
                    label="Claude API (Anthropic)"
                    ok={settings.integrations.claude_configured}
                    detail={settings.claude_model}
                  />
                </div>
              )}
            </div>

            {/* Services Health */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Saúde dos Serviços</h3>
              {health && (
                <div>
                  {Object.entries(health.services).map(([name, s]) => (
                    <ServiceRow key={name} name={name} status={s.status} error={s.error} />
                  ))}
                </div>
              )}
            </div>

            {/* Priority Keywords */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
              {settings && (
                <div className="space-y-4">
                  {[
                    { label: "CRÍTICO", kws: settings.priority_keywords.critical, color: "text-red-400 bg-red-500/10 border-red-500/30" },
                    { label: "ALTO", kws: settings.priority_keywords.high, color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
                    { label: "MÉDIO", kws: settings.priority_keywords.medium, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
                  ].map(({ label, kws, color }) => (
                    <div key={label}>
                      <p className={`text-xs font-semibold mb-2 ${color.split(" ")[0]}`}>{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {kws.map((kw) => (
                          <span key={kw} className={`px-2 py-0.5 rounded border text-xs ${color}`}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
