"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Settings2, Key, MessageCircle,
  Mail, Brain, Tag, RefreshCw, Play,
} from "lucide-react";
import { clsx } from "clsx";

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

const StatusDot = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    {ok
      ? <CheckCircle size={14} className="text-green-400" />
      : <XCircle size={14} className="text-red-400" />
    }
    <span className={clsx("text-sm", ok ? "text-green-400" : "text-red-400")}>{label}</span>
  </div>
);

function KeywordList({ keywords, color }: { keywords: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {keywords.map((kw) => (
        <span key={kw} className={clsx("text-xs px-2 py-0.5 rounded-full border", color)}>
          {kw}
        </span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [triggering, setTriggering] = useState<string | null>(null);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const { data: settings, isLoading, refetch } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  async function triggerAction(action: "check" | "summary") {
    setTriggering(action);
    setTriggerMsg(null);
    try {
      const endpoint = action === "check" ? "/settings/trigger-check" : "/settings/trigger-summary";
      const res = await api.post(endpoint);
      setTriggerMsg(res.data.message ?? "Ação iniciada com sucesso");
    } catch {
      setTriggerMsg("Erro ao executar ação");
    } finally {
      setTriggering(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Configurações" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <span className="text-slate-400">Carregando configurações...</span>
          </main>
        </div>
      </div>
    );
  }

  const s = settings!;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Informações do sistema */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                <Settings2 size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Sistema</h3>
                <button
                  onClick={() => refetch()}
                  className="ml-auto text-slate-400 hover:text-white"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <Row label="Aplicação" value={s.app_name} />
                <Row label="Versão" value={`v${s.app_version}`} />
                <Row label="Ambiente" value={s.environment} highlight={s.environment === "production"} />
                <Row label="Modelo IA" value={s.claude_model} />
                <Row label="Provedor WhatsApp" value={s.whatsapp_provider} />
                <Row label="Intervalo de verificação" value={`${s.check_interval_seconds}s`} />
                <Row label="E-mails por ciclo" value={String(s.max_emails_per_batch)} />
                <Row label="Tamanho máx. anexo" value={`${s.max_attachment_size_mb} MB`} />
                <Row label="Retenção de logs" value={`${s.log_retention_days} dias`} />
              </div>
            </div>

            {/* Status das integrações */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                <Key size={16} className="text-green-400" />
                <h3 className="text-sm font-semibold text-white">Integrações</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Mail size={13} />
                    <span>Outlook / Graph API</span>
                  </div>
                  <StatusDot
                    ok={s.integrations.outlook_configured}
                    label={s.integrations.outlook_configured ? "Configurado" : "Não configurado"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </div>
                  <StatusDot
                    ok={s.integrations.whatsapp_configured}
                    label={s.integrations.whatsapp_configured ? "Configurado" : "Não configurado"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Brain size={13} />
                    <span>Claude API</span>
                  </div>
                  <StatusDot
                    ok={s.integrations.claude_configured}
                    label={s.integrations.claude_configured ? "Configurado" : "Não configurado"}
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <div className="text-xs text-slate-500">
                  <span className="text-slate-400">E-mail monitorado: </span>
                  <span className="font-mono">{s.integrations.email_address}</span>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-slate-400">WhatsApp destino: </span>
                  <span className="font-mono">{s.integrations.whatsapp_to}</span>
                </div>
              </div>
            </div>

            {/* Ações manuais */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                <Play size={16} className="text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Ações Manuais</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">Verificar e-mails agora</p>
                    <p className="text-xs text-slate-400 mt-0.5">Dispara um ciclo de verificação imediato</p>
                  </div>
                  <button
                    onClick={() => triggerAction("check")}
                    disabled={triggering !== null}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                  >
                    <RefreshCw size={12} className={triggering === "check" ? "animate-spin" : ""} />
                    Executar
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">Enviar resumo diário</p>
                    <p className="text-xs text-slate-400 mt-0.5">Envia resumo consolidado via WhatsApp</p>
                  </div>
                  <button
                    onClick={() => triggerAction("summary")}
                    disabled={triggering !== null}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
                  >
                    <MessageCircle size={12} className={triggering === "summary" ? "animate-spin" : ""} />
                    Enviar
                  </button>
                </div>
              </div>
              {triggerMsg && (
                <div className="bg-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-300">
                  {triggerMsg}
                </div>
              )}
            </div>

            {/* Keywords */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                <Tag size={16} className="text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Palavras-chave de Prioridade</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-red-400 font-medium uppercase tracking-wide">Crítico</span>
                  <KeywordList
                    keywords={s.priority_keywords.critical.slice(0, 10)}
                    color="border-red-500/30 bg-red-500/10 text-red-300"
                  />
                </div>
                <div>
                  <span className="text-xs text-orange-400 font-medium uppercase tracking-wide">Alto</span>
                  <KeywordList
                    keywords={s.priority_keywords.high.slice(0, 10)}
                    color="border-orange-500/30 bg-orange-500/10 text-orange-300"
                  />
                </div>
                <div>
                  <span className="text-xs text-yellow-400 font-medium uppercase tracking-wide">Médio</span>
                  <KeywordList
                    keywords={s.priority_keywords.medium.slice(0, 10)}
                    color="border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={clsx("text-xs font-medium", highlight ? "text-blue-400" : "text-white")}>
        {value}
      </span>
    </div>
  );
}
