"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, CalendarDays, Bot, Settings2 } from "lucide-react";
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

interface HealthData {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
}

const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
);

export default function SettingsPage() {
  const qc = useQueryClient();
  const [triggerStatus, setTriggerStatus] = useState<"idle" | "running" | "ok" | "err">("idle");
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "running" | "ok" | "err">("idle");

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["system-settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: health } = useQuery<HealthData>({
    queryKey: ["health"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 30_000,
  });

  async function triggerCheck() {
    setTriggerStatus("running");
    try {
      await api.post("/settings/trigger-check");
      setTriggerStatus("ok");
      qc.invalidateQueries({ queryKey: ["stats"] });
    } catch {
      setTriggerStatus("err");
    } finally {
      setTimeout(() => setTriggerStatus("idle"), 4000);
    }
  }

  async function triggerSummary() {
    setSummaryStatus("running");
    try {
      await api.post("/settings/trigger-summary");
      setSummaryStatus("ok");
    } catch {
      setSummaryStatus("err");
    } finally {
      setTimeout(() => setSummaryStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Play size={14} /> Ações Manuais
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={triggerCheck}
                disabled={triggerStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                <Play size={14} />
                {triggerStatus === "running" ? "Verificando..." :
                  triggerStatus === "ok" ? "Disparado!" :
                  triggerStatus === "err" ? "Erro!" :
                  "Verificar E-mails Agora"}
              </button>
              <button
                onClick={triggerSummary}
                disabled={summaryStatus === "running"}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                <CalendarDays size={14} />
                {summaryStatus === "running" ? "Enviando..." :
                  summaryStatus === "ok" ? "Enviado!" :
                  summaryStatus === "err" ? "Erro!" :
                  "Enviar Resumo Diário"}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Integration status */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Settings2 size={14} /> Status das Integrações
              </h3>
              <div className="space-y-3">
                {health?.services && Object.entries(health.services).map(([name, svc]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 capitalize">{name}</span>
                    <div className="flex items-center gap-2">
                      <StatusDot ok={svc.status === "ok"} />
                      <span className={`text-xs ${svc.status === "ok" ? "text-green-400" : "text-red-400"}`}>
                        {svc.status === "ok" ? "Conectado" : "Erro"}
                      </span>
                    </div>
                  </div>
                ))}
                {settings?.integrations && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Outlook</span>
                      <div className="flex items-center gap-2">
                        <StatusDot ok={settings.integrations.outlook_configured} />
                        <span className={`text-xs ${settings.integrations.outlook_configured ? "text-green-400" : "text-red-400"}`}>
                          {settings.integrations.outlook_configured ? "Configurado" : "Não configurado"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">WhatsApp</span>
                      <div className="flex items-center gap-2">
                        <StatusDot ok={settings.integrations.whatsapp_configured} />
                        <span className={`text-xs ${settings.integrations.whatsapp_configured ? "text-green-400" : "text-red-400"}`}>
                          {settings.integrations.whatsapp_configured ? settings.integrations.whatsapp_to : "Não configurado"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Claude AI</span>
                      <div className="flex items-center gap-2">
                        <StatusDot ok={settings.integrations.claude_configured} />
                        <span className={`text-xs ${settings.integrations.claude_configured ? "text-green-400" : "text-red-400"}`}>
                          {settings.integrations.claude_configured ? "API Key configurada" : "Não configurado"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* System config */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Bot size={14} /> Configurações do Sistema
              </h3>
              {settings ? (
                <div className="space-y-2 text-sm">
                  {[
                    ["Versão", settings.app_version],
                    ["Ambiente", settings.environment],
                    ["Intervalo de verificação", `${settings.check_interval_seconds}s`],
                    ["E-mails por ciclo", String(settings.max_emails_per_batch)],
                    ["Tamanho máx. anexo", `${settings.max_attachment_size_mb} MB`],
                    ["Modelo Claude", settings.claude_model],
                    ["Provedor WhatsApp", settings.whatsapp_provider],
                    ["Retenção de logs", `${settings.log_retention_days} dias`],
                    ["E-mail monitorado", settings.integrations.email_address],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between py-1 border-b border-slate-700/50">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-200 font-mono text-xs">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Carregando configurações...</p>
              )}
            </div>
          </div>

          {/* Keywords */}
          {settings?.priority_keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: "CRÍTICO", keys: settings.priority_keywords.critical, cls: "bg-red-500/10 text-red-400 border-red-500/20" },
                  { label: "ALTO", keys: settings.priority_keywords.high, cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
                  { label: "MÉDIO", keys: settings.priority_keywords.medium, cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
                ].map(({ label, keys, cls }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {keys.map((kw) => (
                        <span key={kw} className={`text-xs px-2 py-0.5 rounded border ${cls}`}>{kw}</span>
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
