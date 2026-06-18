"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, Send } from "lucide-react";
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

async function fetchSettings(): Promise<SystemSettings> {
  return api.get("/settings").then((r) => r.data);
}

async function triggerCheck() {
  return api.post("/settings/trigger-check").then((r) => r.data);
}

async function triggerSummary() {
  return api.post("/settings/trigger-summary").then((r) => r.data);
}

const IntegrationRow = ({ label, ok, detail }: { label: string; ok: boolean; detail: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
      <span className="text-sm text-slate-300">{label}</span>
    </div>
    <span className="text-xs text-slate-400 truncate max-w-xs">{detail}</span>
  </div>
);

export default function SettingsPage() {
  const [triggerMsg, setTriggerMsg] = useState("");
  const [summaryMsg, setSummaryMsg] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    refetchInterval: 60_000,
  });

  async function handleCheck() {
    try {
      const result = await triggerCheck();
      setTriggerMsg(`✓ Tarefa enfileirada: ${result.task_id}`);
      setTimeout(() => setTriggerMsg(""), 5000);
    } catch {
      setTriggerMsg("✗ Erro ao disparar verificação");
      setTimeout(() => setTriggerMsg(""), 5000);
    }
  }

  async function handleSummary() {
    try {
      const result = await triggerSummary();
      setSummaryMsg(`✓ Resumo enfileirado: ${result.task_id}`);
      setTimeout(() => setSummaryMsg(""), 5000);
    } catch {
      setSummaryMsg("✗ Erro ao disparar resumo");
      setTimeout(() => setSummaryMsg(""), 5000);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Ações Manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Ações Manuais</h3>
            <div className="flex gap-3 flex-wrap">
              <div>
                <button
                  onClick={handleCheck}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
                >
                  <Play size={14} />
                  Verificar E-mails Agora
                </button>
                {triggerMsg && <p className="text-xs mt-1 text-slate-400">{triggerMsg}</p>}
              </div>
              <div>
                <button
                  onClick={handleSummary}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white transition-colors"
                >
                  <Send size={14} />
                  Enviar Resumo Diário
                </button>
                {summaryMsg && <p className="text-xs mt-1 text-slate-400">{summaryMsg}</p>}
              </div>
            </div>
          </div>

          {/* Status das Integrações */}
          {settings && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-semibold text-white mb-3">Status das Integrações</h3>
              <IntegrationRow
                label="Outlook / Microsoft Graph"
                ok={settings.integrations.outlook_configured}
                detail={settings.integrations.email_address}
              />
              <IntegrationRow
                label="WhatsApp"
                ok={settings.integrations.whatsapp_configured}
                detail={`${settings.whatsapp_provider} → ${settings.integrations.whatsapp_to}`}
              />
              <IntegrationRow
                label="Claude AI (Anthropic)"
                ok={settings.integrations.claude_configured}
                detail={settings.claude_model}
              />
            </div>
          )}

          {/* Configurações do Sistema */}
          {settings && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Parâmetros do Sistema</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Versão", value: settings.app_version },
                  { label: "Ambiente", value: settings.environment },
                  { label: "Intervalo de verificação", value: `${settings.check_interval_seconds}s` },
                  { label: "Máx e-mails por ciclo", value: settings.max_emails_per_batch },
                  { label: "Máx tamanho de anexo", value: `${settings.max_attachment_size_mb} MB` },
                  { label: "Retenção de logs", value: `${settings.log_retention_days} dias` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-900 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className="text-sm text-slate-200 font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Palavras-chave de Prioridade */}
          {settings?.priority_keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Palavras-chave de Prioridade</h3>
              {[
                { level: "CRÍTICO", keys: settings.priority_keywords.critical, color: "text-red-400" },
                { level: "ALTO", keys: settings.priority_keywords.high, color: "text-orange-400" },
                { level: "MÉDIO", keys: settings.priority_keywords.medium, color: "text-yellow-400" },
              ].map(({ level, keys, color }) => (
                <div key={level}>
                  <p className={`text-xs font-medium mb-2 ${color}`}>{level}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keys.map((kw) => (
                      <span key={kw} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
