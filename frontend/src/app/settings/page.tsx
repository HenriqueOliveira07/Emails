"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, Send } from "lucide-react";
import { useState } from "react";

interface SettingsData {
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

const IntegrationRow = ({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
    <div className="flex items-center gap-3">
      {ok ? (
        <CheckCircle size={16} className="text-green-400 shrink-0" />
      ) : (
        <XCircle size={16} className="text-red-400 shrink-0" />
      )}
      <div>
        <p className="text-sm text-white">{label}</p>
        {detail && <p className="text-xs text-slate-400">{detail}</p>}
      </div>
    </div>
    <span
      className={`text-xs px-2 py-0.5 rounded-md ${
        ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
      }`}
    >
      {ok ? "Configurado" : "Não configurado"}
    </span>
  </div>
);

export default function SettingsPage() {
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const triggerCheck = useMutation({
    mutationFn: () => api.post("/settings/trigger-check").then((r) => r.data),
    onSuccess: (data) => setCheckResult(`Tarefa iniciada: ${data.task_id}`),
    onError: () => setCheckResult("Erro ao iniciar verificação"),
  });

  const triggerSummary = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary").then((r) => r.data),
    onSuccess: (data) => setSummaryResult(`Tarefa iniciada: ${data.task_id}`),
    onError: () => setSummaryResult("Erro ao enviar resumo"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Configurações" />
          <main className="flex-1 p-6">
            <p className="text-slate-400">Carregando configurações...</p>
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
          {/* Sistema */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Informações do Sistema</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Aplicação", value: settings?.app_name },
                { label: "Versão", value: settings?.app_version },
                { label: "Ambiente", value: settings?.environment },
                { label: "Modelo IA", value: settings?.claude_model },
                { label: "WhatsApp Provider", value: settings?.whatsapp_provider },
                { label: "Intervalo de verificação", value: `${settings?.check_interval_seconds}s` },
                { label: "Máx. e-mails/ciclo", value: String(settings?.max_emails_per_batch) },
                { label: "Máx. tamanho anexo", value: `${settings?.max_attachment_size_mb}MB` },
                { label: "Retenção de logs", value: `${settings?.log_retention_days} dias` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm text-white font-medium mt-0.5">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
            <div>
              <IntegrationRow
                label="Microsoft Outlook 365"
                ok={settings?.integrations.outlook_configured ?? false}
                detail={settings?.integrations.email_address}
              />
              <IntegrationRow
                label="WhatsApp API"
                ok={settings?.integrations.whatsapp_configured ?? false}
                detail={settings?.integrations.whatsapp_to}
              />
              <IntegrationRow
                label="Claude AI (Anthropic)"
                ok={settings?.integrations.claude_configured ?? false}
                detail={settings?.claude_model}
              />
            </div>
          </div>

          {/* Palavras-chave */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
            <div className="space-y-4">
              {[
                { label: "CRÍTICO", color: "text-red-400", kws: settings?.priority_keywords.critical },
                { label: "ALTO", color: "text-orange-400", kws: settings?.priority_keywords.high },
                { label: "MÉDIO", color: "text-yellow-400", kws: settings?.priority_keywords.medium },
              ].map(({ label, color, kws }) => (
                <div key={label}>
                  <p className={`text-xs font-semibold ${color} mb-2`}>{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {kws?.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Ações Manuais</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <button
                  onClick={() => triggerCheck.mutate()}
                  disabled={triggerCheck.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Play size={14} />
                  {triggerCheck.isPending ? "Iniciando..." : "Verificar E-mails Agora"}
                </button>
                {checkResult && (
                  <p className="text-xs text-slate-400 mt-2">{checkResult}</p>
                )}
              </div>
              <div>
                <button
                  onClick={() => triggerSummary.mutate()}
                  disabled={triggerSummary.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Send size={14} />
                  {triggerSummary.isPending ? "Enviando..." : "Enviar Resumo Diário"}
                </button>
                {summaryResult && (
                  <p className="text-xs text-slate-400 mt-2">{summaryResult}</p>
                )}
              </div>
            </div>
            <div className="mt-4 bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">API Docs:</span>{" "}
                Acesse{" "}
                <span className="text-blue-400 font-mono">
                  http://localhost:8000/api/docs
                </span>{" "}
                para a documentação completa da API REST.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                <span className="text-slate-300 font-medium">Flower:</span>{" "}
                Monitor de tarefas Celery em{" "}
                <span className="text-blue-400 font-mono">
                  http://localhost:5555
                </span>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
