"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSettings, fetchKeywords, triggerCheck, triggerSummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Settings, Zap, Send, Key,
  Database, MessageSquare, Brain, Clock,
} from "lucide-react";
import { useState } from "react";

function IntegrationBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
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

function KeywordBadge({ word }: { word: string }) {
  return (
    <span className="inline-block text-xs bg-slate-700 text-slate-300 border border-slate-600 rounded px-2 py-0.5">
      {word}
    </span>
  );
}

export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
  });

  const check = useMutation({
    mutationFn: triggerCheck,
    onSuccess: () => showToast("Verificação de e-mails iniciada!"),
  });

  const summary = useMutation({
    mutationFn: triggerSummary,
    onSuccess: () => showToast("Resumo diário enviado!"),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-5xl">
          {toast && (
            <div className="fixed top-4 right-4 bg-slate-700 border border-slate-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
              {toast}
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-slate-400 py-8">Carregando configurações...</div>
          ) : (
            <>
              {/* Ações rápidas */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" /> Ações Manuais
                </h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => check.mutate()}
                    disabled={check.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                  >
                    <Settings size={14} className={check.isPending ? "animate-spin" : ""} />
                    {check.isPending ? "Verificando..." : "Verificar E-mails Agora"}
                  </button>
                  <button
                    onClick={() => summary.mutate()}
                    disabled={summary.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                  >
                    <Send size={14} />
                    {summary.isPending ? "Enviando..." : "Enviar Resumo Diário"}
                  </button>
                </div>
              </div>

              {/* Status das integrações */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Key size={14} className="text-blue-400" /> Integrações
                </h2>
                <IntegrationBadge
                  ok={settings?.integrations.outlook_configured ?? false}
                  label="Microsoft Outlook (Azure AD)"
                />
                <IntegrationBadge
                  ok={settings?.integrations.whatsapp_configured ?? false}
                  label="WhatsApp Business API"
                />
                <IntegrationBadge
                  ok={settings?.integrations.claude_configured ?? false}
                  label="Claude AI (Anthropic)"
                />
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">E-mail monitorado</span>
                    <span className="text-slate-300 font-mono">{settings?.integrations.email_address}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">WhatsApp destino</span>
                    <span className="text-slate-300 font-mono">{settings?.integrations.whatsapp_to}</span>
                  </div>
                </div>
              </div>

              {/* Parâmetros do sistema */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock size={14} className="text-teal-400" /> Processamento
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: "Intervalo de verificação", value: `${settings?.check_interval_seconds}s` },
                      { label: "E-mails por ciclo", value: settings?.max_emails_per_batch },
                      { label: "Tamanho máx. anexo", value: `${settings?.max_attachment_size_mb} MB` },
                      { label: "Retenção de logs", value: `${settings?.log_retention_days} dias` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Brain size={14} className="text-purple-400" /> IA e Modelos
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: "Modelo Claude", value: settings?.claude_model },
                      { label: "Provedor WhatsApp", value: settings?.whatsapp_provider },
                      { label: "Ambiente", value: settings?.environment },
                      { label: "Versão", value: settings?.app_version },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-white font-mono text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Palavras-chave */}
              {keywords && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageSquare size={14} className="text-orange-400" /> Palavras-chave de Prioridade
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: "Crítico", key: "CRITICO", color: "text-red-400" },
                      { label: "Alto", key: "ALTO", color: "text-orange-400" },
                      { label: "Médio", key: "MEDIO", color: "text-yellow-400" },
                    ].map(({ label, key, color }) => (
                      <div key={key}>
                        <p className={`text-xs font-medium mb-2 ${color}`}>{label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(keywords[key] ?? []).map((w: string) => (
                            <KeywordBadge key={w} word={w} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API docs link */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Database size={14} className="text-slate-400" /> Documentação da API
                </h2>
                <p className="text-sm text-slate-400 mb-3">
                  A documentação interativa da API REST está disponível via Swagger UI.
                </p>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
                >
                  Abrir Swagger UI →
                </a>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
