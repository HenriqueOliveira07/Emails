"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchSettings,
  fetchKeywords,
  fetchHealth,
  triggerCheck,
  triggerSummary,
  SystemSettings,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Settings,
  Key,
  Bell,
  Mail,
  Cpu,
} from "lucide-react";
import { clsx } from "clsx";

interface IntegrationCardProps {
  label: string;
  configured: boolean;
  detail?: string;
  icon: React.ReactNode;
}

function IntegrationCard({ label, configured, detail, icon }: IntegrationCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
      <div
        className={clsx(
          "p-2 rounded-lg border",
          configured
            ? "bg-green-500/20 text-green-400 border-green-500/30"
            : "bg-red-500/20 text-red-400 border-red-500/30"
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{label}</p>
          {configured ? (
            <CheckCircle size={13} className="text-green-400" />
          ) : (
            <XCircle size={13} className="text-red-400" />
          )}
        </div>
        {detail && <p className="text-xs text-slate-400 mt-0.5 truncate">{detail}</p>}
        <p
          className={clsx(
            "text-xs mt-1 font-medium",
            configured ? "text-green-400" : "text-red-400"
          )}
        >
          {configured ? "Configurado" : "Não configurado"}
        </p>
      </div>
    </div>
  );
}

function KeywordSection({
  title,
  keywords,
  colorClass,
}: {
  title: string;
  keywords: string[];
  colorClass: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className={clsx("text-xs font-semibold uppercase tracking-wide", colorClass)}>
        {title}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <span
            key={kw}
            className={clsx(
              "px-2 py-0.5 rounded-md text-xs border",
              colorClass.includes("red")
                ? "bg-red-500/10 text-red-300 border-red-500/20"
                : colorClass.includes("orange")
                ? "bg-orange-500/10 text-orange-300 border-orange-500/20"
                : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
            )}
          >
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [triggerMsg, setTriggerMsg] = useState("");
  const [summaryMsg, setSummaryMsg] = useState("");

  const { data: settings, isLoading: loadingSettings } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const checkMut = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => setTriggerMsg(`Tarefa iniciada: ${data.task_id}`),
    onError: () => setTriggerMsg("Erro ao iniciar verificação"),
  });

  const summaryMut = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (data) => setSummaryMsg(`Resumo iniciado: ${data.task_id}`),
    onError: () => setSummaryMsg("Erro ao iniciar resumo"),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 overflow-y-auto space-y-8">

          {/* Status das Integrações */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings size={16} className="text-blue-400" />
              Status das Integrações
            </h2>
            {loadingSettings ? (
              <p className="text-sm text-slate-400">Carregando...</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <IntegrationCard
                  label="Microsoft Outlook"
                  configured={settings?.integrations.outlook_configured ?? false}
                  detail={settings?.integrations.email_address}
                  icon={<Mail size={16} />}
                />
                <IntegrationCard
                  label="WhatsApp"
                  configured={settings?.integrations.whatsapp_configured ?? false}
                  detail={
                    settings?.integrations.whatsapp_to
                      ? `Destino: ${settings.integrations.whatsapp_to} (${settings.whatsapp_provider})`
                      : undefined
                  }
                  icon={<Bell size={16} />}
                />
                <IntegrationCard
                  label="Claude AI"
                  configured={settings?.integrations.claude_configured ?? false}
                  detail={settings?.claude_model}
                  icon={<Cpu size={16} />}
                />
                <IntegrationCard
                  label="PostgreSQL"
                  configured={health?.services?.postgresql?.status === "ok"}
                  detail={health?.services?.postgresql?.status ?? "Verificando..."}
                  icon={<Key size={16} />}
                />
                <IntegrationCard
                  label="Redis"
                  configured={health?.services?.redis?.status === "ok"}
                  detail={health?.services?.redis?.status ?? "Verificando..."}
                  icon={<Key size={16} />}
                />
              </div>
            )}
          </section>

          {/* Configurações Gerais */}
          {settings && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Settings size={16} className="text-slate-400" />
                Parâmetros do Sistema
              </h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-700/50">
                    {[
                      ["Versão", `v${settings.app_version}`],
                      ["Ambiente", settings.environment],
                      ["Intervalo de verificação", `${settings.check_interval_seconds}s`],
                      ["E-mails por ciclo", String(settings.max_emails_per_batch)],
                      ["Tamanho máx. de anexo", `${settings.max_attachment_size_mb} MB`],
                      ["Modelo Claude", settings.claude_model],
                      ["Provedor WhatsApp", settings.whatsapp_provider],
                      ["Retenção de logs", `${settings.log_retention_days} dias`],
                    ].map(([key, value]) => (
                      <tr key={key} className="hover:bg-slate-700/20">
                        <td className="px-4 py-3 text-slate-400 w-56">{key}</td>
                        <td className="px-4 py-3 text-slate-200 font-mono text-xs">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Palavras-chave */}
          {keywords && (
            <section className="space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Key size={16} className="text-slate-400" />
                Palavras-chave de Prioridade
              </h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
                <KeywordSection
                  title="Crítico"
                  keywords={keywords.CRITICO ?? []}
                  colorClass="text-red-400"
                />
                <KeywordSection
                  title="Alto"
                  keywords={keywords.ALTO ?? []}
                  colorClass="text-orange-400"
                />
                <KeywordSection
                  title="Médio"
                  keywords={keywords.MEDIO ?? []}
                  colorClass="text-yellow-400"
                />
              </div>
            </section>
          )}

          {/* Ações Manuais */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Send size={16} className="text-slate-400" />
              Ações Manuais
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Verificar agora */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-white">Verificar E-mails Agora</h3>
                <p className="text-xs text-slate-400">
                  Dispara imediatamente uma verificação de novos e-mails no Outlook.
                </p>
                <button
                  onClick={() => { setTriggerMsg(""); checkMut.mutate(); }}
                  disabled={checkMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <RefreshCw size={14} className={checkMut.isPending ? "animate-spin" : ""} />
                  {checkMut.isPending ? "Verificando..." : "Verificar Agora"}
                </button>
                {triggerMsg && (
                  <p className="text-xs text-green-400 font-mono break-all">{triggerMsg}</p>
                )}
              </div>

              {/* Resumo diário */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-white">Enviar Resumo Diário</h3>
                <p className="text-xs text-slate-400">
                  Envia o resumo do dia via WhatsApp com as estatísticas de processamento.
                </p>
                <button
                  onClick={() => { setSummaryMsg(""); summaryMut.mutate(); }}
                  disabled={summaryMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Send size={14} />
                  {summaryMut.isPending ? "Enviando..." : "Enviar Resumo"}
                </button>
                {summaryMsg && (
                  <p className="text-xs text-green-400 font-mono break-all">{summaryMsg}</p>
                )}
              </div>
            </div>
          </section>

          {/* Info */}
          <section>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-xs text-slate-500 space-y-1">
              <p>
                Para alterar configurações sensíveis (credenciais, tokens), edite o arquivo{" "}
                <code className="font-mono text-slate-400">.env</code> e reinicie os serviços com{" "}
                <code className="font-mono text-slate-400">docker compose restart</code>.
              </p>
              <p>
                Documentação da API REST disponível em{" "}
                <code className="font-mono text-slate-400">/api/docs</code>.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
