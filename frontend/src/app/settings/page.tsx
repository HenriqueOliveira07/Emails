"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Mail,
  MessageSquare,
  Bot,
  Play,
  Send,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "") + "/api";

interface SettingsIntegrations {
  outlook_configured: boolean;
  whatsapp_configured: boolean;
  claude_configured: boolean;
  email_address: string;
  whatsapp_to: string;
}

interface Settings {
  app_name: string;
  app_version: string;
  environment: string;
  check_interval_seconds: number;
  max_emails_per_batch: number;
  max_attachment_size_mb: number;
  claude_model: string;
  whatsapp_provider: string;
  log_retention_days: number;
  integrations: SettingsIntegrations;
  priority_keywords: {
    critical: string[];
    high: string[];
    medium: string[];
  };
}

interface Keywords {
  critical?: string[];
  high?: string[];
  medium?: string[];
}

interface Health {
  status: string;
  outlook_connected?: boolean;
  whatsapp_connected?: boolean;
  claude_connected?: boolean;
  [key: string]: unknown;
}

interface ActionResult {
  task_id?: string;
  status?: string;
  message?: string;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={clsx(
        "inline-block w-2.5 h-2.5 rounded-full flex-shrink-0",
        ok ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-red-500"
      )}
    />
  );
}

function AccordionSection({
  title,
  keywords,
  color,
}: {
  title: string;
  keywords: string[];
  color: "red" | "orange" | "yellow";
}) {
  const [open, setOpen] = useState(false);
  const colorMap = {
    red: {
      header: "text-red-400",
      badge: "bg-red-900/50 text-red-300 border-red-700/60",
      border: "border-red-800/40",
    },
    orange: {
      header: "text-orange-400",
      badge: "bg-orange-900/50 text-orange-300 border-orange-700/60",
      border: "border-orange-800/40",
    },
    yellow: {
      header: "text-yellow-400",
      badge: "bg-yellow-900/50 text-yellow-300 border-yellow-700/60",
      border: "border-yellow-800/40",
    },
  };
  const c = colorMap[color];

  return (
    <div className={clsx("border rounded-lg overflow-hidden", c.border)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <span className={clsx("font-semibold text-sm", c.header)}>{title}</span>
          <span className="text-xs text-slate-500">({keywords.length} palavras)</span>
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 bg-slate-900/40 border-t border-slate-700/40">
          {keywords.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma palavra-chave configurada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className={clsx("text-xs px-2.5 py-1 rounded-full border font-medium", c.badge)}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

let toastCounter = 0;

export default function SettingsPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [triggerCheckLoading, setTriggerCheckLoading] = useState(false);
  const [triggerSummaryLoading, setTriggerSummaryLoading] = useState(false);

  function addToast(type: "success" | "error", message: string) {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await axios.get<Settings>(`${API_BASE}/settings`);
      return data;
    },
    staleTime: 60_000,
  });

  const { data: keywords } = useQuery<Keywords>({
    queryKey: ["settings-keywords"],
    queryFn: async () => {
      const { data } = await axios.get<Keywords>(`${API_BASE}/settings/keywords`);
      return data;
    },
    staleTime: 60_000,
  });

  const { data: health } = useQuery<Health>({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await axios.get<Health>(`${API_BASE}/dashboard/health`);
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  async function handleTriggerCheck() {
    setTriggerCheckLoading(true);
    try {
      const { data } = await axios.post<ActionResult>(`${API_BASE}/settings/trigger-check`);
      addToast("success", data.message || "Verificação de e-mails iniciada com sucesso.");
    } catch {
      addToast("error", "Erro ao iniciar verificação de e-mails.");
    } finally {
      setTriggerCheckLoading(false);
    }
  }

  async function handleTriggerSummary() {
    setTriggerSummaryLoading(true);
    try {
      const { data } = await axios.post<ActionResult>(`${API_BASE}/settings/trigger-summary`);
      addToast("success", data.message || "Resumo diário enviado com sucesso.");
    } catch {
      addToast("error", "Erro ao enviar resumo diário.");
    } finally {
      setTriggerSummaryLoading(false);
    }
  }

  const integrations = settings?.integrations;

  const keywordsCritical =
    keywords?.critical ?? settings?.priority_keywords?.critical ?? [];
  const keywordsHigh =
    keywords?.high ?? settings?.priority_keywords?.high ?? [];
  const keywordsMedium =
    keywords?.medium ?? settings?.priority_keywords?.medium ?? [];

  const configRows = settings
    ? [
        { name: "Intervalo de Verificação", value: `${settings.check_interval_seconds}s` },
        { name: "Máx. E-mails por Lote", value: String(settings.max_emails_per_batch) },
        { name: "Máx. Tamanho de Anexo", value: `${settings.max_attachment_size_mb} MB` },
        { name: "Modelo Claude", value: settings.claude_model },
        { name: "Provedor WhatsApp", value: settings.whatsapp_provider },
        { name: "Retenção de Logs", value: `${settings.log_retention_days} dias` },
        { name: "Versão", value: `${settings.app_name} v${settings.app_version}` },
        { name: "Ambiente", value: settings.environment },
      ]
    : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Toast notifications */}
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={clsx(
                  "flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm transition-all",
                  toast.type === "success"
                    ? "bg-green-900 border-green-700 text-green-200"
                    : "bg-red-900 border-red-700 text-red-200"
                )}
              >
                {toast.type === "success" ? (
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-400" />
                ) : (
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                )}
                <span>{toast.message}</span>
              </div>
            ))}
          </div>

          <div className="max-w-4xl space-y-6">
            {/* Section 1: Integration status */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h2 className="text-white font-semibold text-base">Status das Integrações</h2>
                <p className="text-slate-400 text-sm mt-0.5">Estado atual das conexões com serviços externos.</p>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Outlook */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail size={18} className="text-blue-400" />
                      <span className="text-white font-medium text-sm">Outlook</span>
                    </div>
                    <StatusDot ok={!!(integrations?.outlook_configured)} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className="text-sm text-slate-300">
                    {integrations?.outlook_configured ? (
                      <span className="text-green-400 font-medium">Configurado</span>
                    ) : (
                      <span className="text-red-400 font-medium">Não configurado</span>
                    )}
                  </p>
                  {integrations?.email_address && (
                    <>
                      <p className="text-xs text-slate-500 mt-2 mb-1">Conta</p>
                      <p className="text-xs text-slate-300 truncate" title={integrations.email_address}>
                        {integrations.email_address}
                      </p>
                    </>
                  )}
                </div>

                {/* WhatsApp */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={18} className="text-green-400" />
                      <span className="text-white font-medium text-sm">WhatsApp</span>
                    </div>
                    <StatusDot ok={!!(integrations?.whatsapp_configured)} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className="text-sm text-slate-300">
                    {integrations?.whatsapp_configured ? (
                      <span className="text-green-400 font-medium">Configurado</span>
                    ) : (
                      <span className="text-red-400 font-medium">Não configurado</span>
                    )}
                  </p>
                  {integrations?.whatsapp_to && (
                    <>
                      <p className="text-xs text-slate-500 mt-2 mb-1">Destinatário</p>
                      <p className="text-xs text-slate-300">{integrations.whatsapp_to}</p>
                    </>
                  )}
                  {settings?.whatsapp_provider && (
                    <>
                      <p className="text-xs text-slate-500 mt-2 mb-1">Provedor</p>
                      <p className="text-xs text-slate-300">{settings.whatsapp_provider}</p>
                    </>
                  )}
                </div>

                {/* Claude API */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot size={18} className="text-purple-400" />
                      <span className="text-white font-medium text-sm">Claude API</span>
                    </div>
                    <StatusDot ok={!!(integrations?.claude_configured)} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className="text-sm text-slate-300">
                    {integrations?.claude_configured ? (
                      <span className="text-green-400 font-medium">Configurado</span>
                    ) : (
                      <span className="text-red-400 font-medium">Não configurado</span>
                    )}
                  </p>
                  {settings?.claude_model && (
                    <>
                      <p className="text-xs text-slate-500 mt-2 mb-1">Modelo</p>
                      <p className="text-xs text-slate-300 break-all">{settings.claude_model}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Current configuration */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h2 className="text-white font-semibold text-base">Configuração Atual</h2>
                <p className="text-slate-400 text-sm mt-0.5">Parâmetros operacionais do sistema.</p>
              </div>
              {settingsLoading ? (
                <p className="text-slate-400 text-sm px-5 py-6">Carregando configurações...</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/20">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Configuração
                      </th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Valor Atual
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {configRows.map((row, i) => (
                      <tr
                        key={row.name}
                        className={clsx(
                          "border-b border-slate-700/50",
                          i % 2 === 0 ? "bg-transparent" : "bg-slate-900/10"
                        )}
                      >
                        <td className="px-5 py-3 text-slate-300 text-sm">{row.name}</td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-mono text-blue-300 bg-blue-900/30 border border-blue-800/50 px-2 py-0.5 rounded">
                            {row.value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 3: Priority keywords */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h2 className="text-white font-semibold text-base">Palavras-chave de Prioridade</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Termos usados para classificar a prioridade dos e-mails recebidos.
                </p>
              </div>
              <div className="p-5 space-y-3">
                <AccordionSection
                  title="CRITICO"
                  keywords={keywordsCritical}
                  color="red"
                />
                <AccordionSection
                  title="ALTO"
                  keywords={keywordsHigh}
                  color="orange"
                />
                <AccordionSection
                  title="MEDIO"
                  keywords={keywordsMedium}
                  color="yellow"
                />
              </div>
            </div>

            {/* Section 4: Actions */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h2 className="text-white font-semibold text-base">Ações</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Operações manuais para controle do sistema.
                </p>
              </div>
              <div className="p-5 flex flex-wrap gap-4">
                <button
                  onClick={handleTriggerCheck}
                  disabled={triggerCheckLoading}
                  className={clsx(
                    "inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg border font-medium text-sm transition-all",
                    triggerCheckLoading
                      ? "bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-sm hover:shadow-blue-600/20 hover:shadow-md"
                  )}
                >
                  <Play size={15} />
                  {triggerCheckLoading ? "Iniciando..." : "Verificar E-mails Agora"}
                </button>
                <button
                  onClick={handleTriggerSummary}
                  disabled={triggerSummaryLoading}
                  className={clsx(
                    "inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg border font-medium text-sm transition-all",
                    triggerSummaryLoading
                      ? "bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed"
                      : "bg-slate-700 hover:bg-slate-600 border-slate-600 text-white shadow-sm"
                  )}
                >
                  <Send size={15} />
                  {triggerSummaryLoading ? "Enviando..." : "Enviar Resumo Diario"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
