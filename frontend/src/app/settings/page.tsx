"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Settings2, Zap } from "lucide-react";
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

const IntegrationStatus = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2 py-2">
    {ok ? (
      <CheckCircle size={16} className="text-green-400 shrink-0" />
    ) : (
      <XCircle size={16} className="text-red-400 shrink-0" />
    )}
    <span className={`text-sm ${ok ? "text-green-300" : "text-red-300"}`}>{label}</span>
    <span className={`text-xs ml-auto px-2 py-0.5 rounded ${ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
      {ok ? "Configurado" : "Não configurado"}
    </span>
  </div>
);

export default function SettingsPage() {
  const [triggering, setTriggering] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: () => api.get("/settings/keywords").then((r) => r.data),
  });

  async function trigger(endpoint: string, label: string) {
    setTriggering(label);
    try {
      const res = await api.post(endpoint);
      setMessage(`${label} iniciado — Task ID: ${res.data.task_id}`);
    } catch {
      setMessage(`Erro ao iniciar ${label}`);
    } finally {
      setTriggering(null);
      setTimeout(() => setMessage(null), 5000);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {message && (
            <div className="bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl px-4 py-3 text-sm">
              {message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Informações do Sistema */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 size={16} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Informações do Sistema</h3>
              </div>
              {settings && (
                <div className="space-y-3">
                  {[
                    ["Aplicação", settings.app_name],
                    ["Versão", settings.app_version],
                    ["Ambiente", settings.environment],
                    ["Intervalo de Verificação", `${settings.check_interval_seconds}s`],
                    ["E-mails por Ciclo", String(settings.max_emails_per_batch)],
                    ["Tamanho Máx. Anexo", `${settings.max_attachment_size_mb} MB`],
                    ["Modelo Claude", settings.claude_model],
                    ["Provedor WhatsApp", settings.whatsapp_provider],
                    ["Retenção de Logs", `${settings.log_retention_days} dias`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-700/50">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="text-xs text-slate-200 font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status das Integrações */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
              {settings?.integrations && (
                <div className="divide-y divide-slate-700/50">
                  <IntegrationStatus ok={settings.integrations.outlook_configured} label="Microsoft Outlook / Graph API" />
                  <IntegrationStatus ok={settings.integrations.whatsapp_configured} label="WhatsApp Business API" />
                  <IntegrationStatus ok={settings.integrations.claude_configured} label="Claude AI (Anthropic)" />
                  <div className="py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">E-mail monitorado</span>
                      <span className="text-xs text-slate-300">{settings.integrations.email_address}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">WhatsApp destino</span>
                      <span className="text-xs text-slate-300">{settings.integrations.whatsapp_to}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ações Manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-yellow-400" />
              <h3 className="text-sm font-semibold text-white">Ações Manuais</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => trigger("/settings/trigger-check", "Verificação de E-mails")}
                disabled={triggering !== null}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                {triggering === "Verificação de E-mails" ? "Executando..." : "Verificar E-mails Agora"}
              </button>
              <button
                onClick={() => trigger("/settings/trigger-summary", "Resumo Diário")}
                disabled={triggering !== null}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                {triggering === "Resumo Diário" ? "Executando..." : "Enviar Resumo Diário"}
              </button>
            </div>
          </div>

          {/* Palavras-chave */}
          {keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Crítico", key: "CRITICO", color: "red" },
                  { label: "Alto", key: "ALTO", color: "orange" },
                  { label: "Médio", key: "MEDIO", color: "yellow" },
                  { label: "Spam", key: "spam", color: "slate" },
                ].map(({ label, key, color }) => (
                  <div key={key}>
                    <h4 className={`text-xs font-semibold text-${color}-400 mb-2`}>{label}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(keywords[key] || []).map((kw: string) => (
                        <span key={kw} className={`px-2 py-0.5 rounded text-xs bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                          {kw}
                        </span>
                      ))}
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
