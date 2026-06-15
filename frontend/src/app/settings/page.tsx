"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, RefreshCw, Zap, Send } from "lucide-react";

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

function IntegrationBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
      ok ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
    }`}>
      {ok ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
      <span className={`text-xs font-medium ${ok ? "text-green-400" : "text-red-400"}`}>{label}</span>
    </div>
  );
}

function KeywordPill({ word }: { word: string }) {
  return (
    <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full border border-slate-600">
      {word}
    </span>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [checkMsg, setCheckMsg] = useState("");
  const [summaryMsg, setSummaryMsg] = useState("");

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["system-settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: health } = useQuery({
    queryKey: ["health-full"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const checkMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-check").then((r) => r.data),
    onSuccess: (data) => setCheckMsg(`✓ Verificação iniciada (task: ${data.task_id?.slice(0, 8)}...)`),
    onError: () => setCheckMsg("✗ Erro ao iniciar verificação"),
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary").then((r) => r.data),
    onSuccess: (data) => setSummaryMsg(`✓ Resumo enviado (task: ${data.task_id?.slice(0, 8)}...)`),
    onError: () => setSummaryMsg("✗ Erro ao enviar resumo"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Configurações" />
          <main className="flex-1 p-6 flex items-center justify-center">
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
          {/* Status das integrações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <IntegrationBadge ok={settings?.integrations.outlook_configured ?? false} label="Microsoft Outlook" />
              <IntegrationBadge ok={settings?.integrations.whatsapp_configured ?? false} label="WhatsApp Business" />
              <IntegrationBadge ok={settings?.integrations.claude_configured ?? false} label="Claude AI (Anthropic)" />
              <IntegrationBadge ok={health?.services?.postgresql?.status === "ok"} label="PostgreSQL" />
              <IntegrationBadge ok={health?.services?.redis?.status === "ok"} label="Redis" />
            </div>
          </div>

          {/* Configurações do sistema */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Parâmetros do Sistema</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Versão", value: settings?.app_version },
                { label: "Ambiente", value: settings?.environment },
                { label: "Intervalo de verificação", value: `${settings?.check_interval_seconds}s` },
                { label: "E-mails por ciclo", value: settings?.max_emails_per_batch },
                { label: "Tamanho máx. anexo", value: `${settings?.max_attachment_size_mb} MB` },
                { label: "Modelo Claude", value: settings?.claude_model },
                { label: "Provedor WhatsApp", value: settings?.whatsapp_provider },
                { label: "Retenção de logs", value: `${settings?.log_retention_days} dias` },
                { label: "E-mail monitorado", value: settings?.integrations.email_address },
                { label: "WhatsApp destino", value: settings?.integrations.whatsapp_to },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm text-white font-medium truncate">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ações manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              Ações Manuais
            </h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => checkMutation.mutate()}
                  disabled={checkMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm text-white font-medium transition-colors"
                >
                  <RefreshCw size={14} className={checkMutation.isPending ? "animate-spin" : ""} />
                  Verificar E-mails Agora
                </button>
                {checkMsg && <p className="text-xs text-slate-400">{checkMsg}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => summaryMutation.mutate()}
                  disabled={summaryMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-sm text-white font-medium transition-colors"
                >
                  <Send size={14} />
                  Enviar Resumo Diário
                </button>
                {summaryMsg && <p className="text-xs text-slate-400">{summaryMsg}</p>}
              </div>
            </div>
          </div>

          {/* Palavras-chave */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-red-400 mb-2">
                  CRÍTICO ({settings?.priority_keywords.critical.length ?? 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {settings?.priority_keywords.critical.map((kw) => (
                    <KeywordPill key={kw} word={kw} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-400 mb-2">
                  ALTO ({settings?.priority_keywords.high.length ?? 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {settings?.priority_keywords.high.map((kw) => (
                    <KeywordPill key={kw} word={kw} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-yellow-400 mb-2">
                  MÉDIO ({settings?.priority_keywords.medium.length ?? 0})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {settings?.priority_keywords.medium.map((kw) => (
                    <KeywordPill key={kw} word={kw} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info setup */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Configuração do Ambiente</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Para alterar integrações ou credenciais, edite o arquivo{" "}
              <code className="px-1 py-0.5 bg-slate-700 rounded text-slate-200">.env</code>{" "}
              na raiz do projeto e reinicie os containers com{" "}
              <code className="px-1 py-0.5 bg-slate-700 rounded text-slate-200">
                docker-compose restart
              </code>
              . Consulte o{" "}
              <code className="px-1 py-0.5 bg-slate-700 rounded text-slate-200">.env.example</code>{" "}
              para referência de todas as variáveis disponíveis.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
