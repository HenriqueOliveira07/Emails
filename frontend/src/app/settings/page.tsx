"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, Calendar, Tag } from "lucide-react";

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
  <div className="flex items-center gap-2">
    {ok ? (
      <CheckCircle size={16} className="text-green-400 shrink-0" />
    ) : (
      <XCircle size={16} className="text-red-400 shrink-0" />
    )}
    <span className={`text-sm ${ok ? "text-green-400" : "text-red-400"}`}>{label}</span>
  </div>
);

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
    staleTime: 60_000,
  });

  const triggerCheck = useMutation({
    mutationFn: () => api.post("/settings/trigger-check").then((r) => r.data),
  });

  const triggerSummary = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary").then((r) => r.data),
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: () => api.get("/settings/keywords").then((r) => r.data),
    staleTime: 300_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-slate-400 py-16">Carregando configurações...</div>
          ) : settings ? (
            <>
              {/* Informações do sistema */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Informações do Sistema</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Aplicação", value: settings.app_name },
                    { label: "Versão", value: settings.app_version },
                    { label: "Ambiente", value: settings.environment },
                    { label: "Modelo IA", value: settings.claude_model },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">{label}</p>
                      <p className="text-sm text-white font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parâmetros de processamento */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Processamento</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Intervalo de Verificação", value: `${settings.check_interval_seconds}s` },
                    { label: "E-mails por Ciclo", value: settings.max_emails_per_batch },
                    { label: "Tamanho Máx. Anexo", value: `${settings.max_attachment_size_mb} MB` },
                    { label: "Retenção de Logs", value: `${settings.log_retention_days} dias` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">{label}</p>
                      <p className="text-sm text-white font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status das integrações */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Status das Integrações</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Microsoft Outlook</p>
                    <IntegrationStatus
                      ok={settings.integrations.outlook_configured}
                      label={settings.integrations.outlook_configured ? "Configurado" : "Não configurado"}
                    />
                    <p className="text-xs text-slate-400 font-mono truncate">
                      {settings.integrations.email_address}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      WhatsApp ({settings.whatsapp_provider})
                    </p>
                    <IntegrationStatus
                      ok={settings.integrations.whatsapp_configured}
                      label={settings.integrations.whatsapp_configured ? "Configurado" : "Não configurado"}
                    />
                    <p className="text-xs text-slate-400 font-mono">
                      Para: {settings.integrations.whatsapp_to}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Claude AI</p>
                    <IntegrationStatus
                      ok={settings.integrations.claude_configured}
                      label={settings.integrations.claude_configured ? "Configurado" : "Não configurado"}
                    />
                    <p className="text-xs text-slate-400">{settings.claude_model}</p>
                  </div>
                </div>
              </div>

              {/* Ações manuais */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Ações Manuais</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => triggerCheck.mutate()}
                    disabled={triggerCheck.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                  >
                    <Play size={14} />
                    {triggerCheck.isPending ? "Iniciando..." : "Verificar E-mails Agora"}
                  </button>
                  <button
                    onClick={() => triggerSummary.mutate()}
                    disabled={triggerSummary.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                  >
                    <Calendar size={14} />
                    {triggerSummary.isPending ? "Enviando..." : "Enviar Resumo Diário"}
                  </button>
                </div>
                {triggerCheck.isSuccess && (
                  <p className="text-xs text-green-400">
                    Tarefa iniciada: ID {triggerCheck.data?.task_id}
                  </p>
                )}
                {triggerSummary.isSuccess && (
                  <p className="text-xs text-green-400">
                    Resumo diário enviado: ID {triggerSummary.data?.task_id}
                  </p>
                )}
              </div>

              {/* Palavras-chave */}
              {keywords && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Tag size={14} className="text-slate-400" />
                    Palavras-chave de Classificação
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[
                      { label: "CRÍTICO", key: "CRITICO", cls: "text-red-400 border-red-500/30 bg-red-500/10" },
                      { label: "ALTO", key: "ALTO", cls: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
                      { label: "MÉDIO", key: "MEDIO", cls: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
                      { label: "SPAM", key: "spam", cls: "text-slate-400 border-slate-600 bg-slate-700/50" },
                    ].map(({ label, key, cls }) => (
                      <div key={key} className={`border rounded-lg p-3 ${cls.split(" ").slice(1).join(" ")}`}>
                        <p className={`text-xs font-semibold mb-2 ${cls.split(" ")[0]}`}>{label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(keywords[key] ?? []).map((kw: string) => (
                            <span key={kw} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Para alterar as palavras-chave, edite as variáveis de ambiente e reinicie o backend.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-red-400 py-16">Erro ao carregar configurações</div>
          )}
        </main>
      </div>
    </div>
  );
}
