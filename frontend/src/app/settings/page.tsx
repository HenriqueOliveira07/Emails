"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSettings, fetchHealth, triggerCheck, triggerSummary, SystemSettings } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, RefreshCw, Send, Server, Cpu, MessageCircle, Mail,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const StatusDot = ({ ok }: { ok: boolean }) =>
  ok ? (
    <CheckCircle size={14} className="text-green-400" />
  ) : (
    <XCircle size={14} className="text-red-400" />
  );

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={clsx("text-xs text-slate-200", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function KeywordPills({ keywords }: { keywords: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {keywords.map((k) => (
        <span key={k} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
          {k}
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [summaryMsg, setSummaryMsg] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    refetchInterval: 60_000,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const checkMutation = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => {
      setCheckMsg(`Tarefa iniciada: ${data?.task_id ?? "ok"}`);
      setTimeout(() => setCheckMsg(null), 4000);
    },
  });

  const summaryMutation = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (data) => {
      setSummaryMsg(`Resumo iniciado: ${data?.task_id ?? "ok"}`);
      setTimeout(() => setSummaryMsg(null), 4000);
    },
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

  const services = health?.services ?? {};

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Ações rápidas */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => checkMutation.mutate()}
              disabled={checkMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
            >
              <RefreshCw size={14} className={checkMutation.isPending ? "animate-spin" : ""} />
              Verificar E-mails Agora
            </button>
            <button
              onClick={() => summaryMutation.mutate()}
              disabled={summaryMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
            >
              <Send size={14} />
              Enviar Resumo Diário
            </button>
            {checkMsg && (
              <span className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{checkMsg}</span>
            )}
            {summaryMsg && (
              <span className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">{summaryMsg}</span>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Status das Integrações */}
            <Section title="Status das Integrações">
              <div className="space-y-3">
                {[
                  {
                    label: "Microsoft Outlook",
                    icon: <Mail size={16} className="text-blue-400" />,
                    ok: settings?.integrations.outlook_configured ?? false,
                    detail: settings?.integrations.email_address || "Não configurado",
                  },
                  {
                    label: "WhatsApp",
                    icon: <MessageCircle size={16} className="text-green-400" />,
                    ok: settings?.integrations.whatsapp_configured ?? false,
                    detail: settings?.integrations.whatsapp_to || "Não configurado",
                  },
                  {
                    label: "Claude AI",
                    icon: <Cpu size={16} className="text-purple-400" />,
                    ok: settings?.integrations.claude_configured ?? false,
                    detail: settings?.claude_model || "Não configurado",
                  },
                  {
                    label: "PostgreSQL",
                    icon: <Server size={16} className="text-orange-400" />,
                    ok: services?.postgresql?.status === "ok",
                    detail: services?.postgresql?.status === "ok" ? "Conectado" : (services?.postgresql?.error || "Desconectado"),
                  },
                  {
                    label: "Redis",
                    icon: <Server size={16} className="text-red-400" />,
                    ok: services?.redis?.status === "ok",
                    detail: services?.redis?.status === "ok" ? "Conectado" : (services?.redis?.error || "Desconectado"),
                  },
                ].map(({ label, icon, ok, detail }) => (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                    {icon}
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{label}</p>
                      <p className="text-xs text-slate-500 truncate">{detail}</p>
                    </div>
                    <StatusDot ok={ok} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Configurações da Aplicação */}
            <Section title="Configurações da Aplicação">
              {settings && (
                <div>
                  <Row label="Versão" value={settings.app_version} />
                  <Row label="Ambiente" value={settings.environment} />
                  <Row label="Intervalo de verificação" value={`${settings.check_interval_seconds}s`} />
                  <Row label="E-mails por ciclo" value={settings.max_emails_per_batch} />
                  <Row label="Tamanho máx. de anexo" value={`${settings.max_attachment_size_mb} MB`} />
                  <Row label="Modelo IA" value={settings.claude_model} mono />
                  <Row label="Provedor WhatsApp" value={settings.whatsapp_provider} />
                  <Row label="Retenção de logs" value={`${settings.log_retention_days} dias`} />
                </div>
              )}
            </Section>
          </div>

          {/* Palavras-chave de Prioridade */}
          {settings?.priority_keywords && (
            <div className="grid lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Palavras-chave CRÍTICO",
                  kws: settings.priority_keywords.critical,
                  cls: "text-red-400",
                },
                {
                  title: "Palavras-chave ALTO",
                  kws: settings.priority_keywords.high,
                  cls: "text-orange-400",
                },
                {
                  title: "Palavras-chave MÉDIO",
                  kws: settings.priority_keywords.medium,
                  cls: "text-yellow-400",
                },
              ].map(({ title, kws, cls }) => (
                <div key={title} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <h3 className={clsx("text-sm font-semibold mb-3", cls)}>{title}</h3>
                  <KeywordPills keywords={kws} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
