"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSettings, fetchHealth, triggerCheck, triggerSummary, SystemSettings, HealthStatus } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, AlertCircle, Play, Send,
  Mail, MessageCircle, Brain, Settings as SettingsIcon,
  Database, Server, Clock,
} from "lucide-react";
import { clsx } from "clsx";

const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={clsx("w-2 h-2 rounded-full shrink-0", ok ? "bg-green-400" : "bg-red-400")} />
);

export default function SettingsPage() {
  const [toast, setToast] = useState("");
  const [taskId, setTaskId] = useState("");

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 30_000,
  });

  const { data: health, refetch: refetchHealth } = useQuery<HealthStatus>({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const triggerCheckMut = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => {
      setTaskId(data.task_id);
      showToast("Verificação de e-mails iniciada!");
    },
    onError: () => showToast("Falha ao iniciar verificação"),
  });

  const triggerSummaryMut = useMutation({
    mutationFn: triggerSummary,
    onSuccess: () => showToast("Resumo diário iniciado!"),
    onError: () => showToast("Falha ao iniciar resumo"),
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const integrations = settings?.integrations;
  const services = health?.services ?? {};

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-5 overflow-y-auto">

          {toast && (
            <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
              {toast}
            </div>
          )}

          {/* System Health */}
          <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Server size={16} className="text-cyan-400" />
                Status do Sistema
              </h2>
              <div className="flex items-center gap-3">
                <div className={clsx("flex items-center gap-1.5 text-xs px-2 py-1 rounded",
                  health?.overall === "ok" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {health?.overall === "ok" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {health?.overall === "ok" ? "Sistema Saudável" : "Sistema Degradado"}
                </div>
                <button
                  onClick={() => refetchHealth()}
                  className="text-xs px-2 py-1 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded transition-colors"
                >
                  Verificar
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(services).map(([name, svc]) => (
                <div key={name} className="flex items-center justify-between px-3 py-2 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={svc.status === "ok"} />
                    <span className="text-sm text-slate-300 capitalize">{name}</span>
                  </div>
                  <span className={clsx("text-xs", svc.status === "ok" ? "text-green-400" : "text-red-400")}>
                    {svc.status === "ok" ? "Conectado" : svc.error || "Erro"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Integrations */}
          <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <SettingsIcon size={16} className="text-blue-400" />
              Integrações
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Outlook / Microsoft Graph",
                  icon: Mail,
                  ok: integrations?.outlook_configured,
                  detail: integrations?.email_address,
                  color: "blue",
                },
                {
                  label: "WhatsApp",
                  icon: MessageCircle,
                  ok: integrations?.whatsapp_configured,
                  detail: integrations?.whatsapp_to
                    ? `Destino: ${integrations.whatsapp_to}`
                    : undefined,
                  color: "green",
                },
                {
                  label: "Claude AI",
                  icon: Brain,
                  ok: integrations?.claude_configured,
                  detail: settings?.claude_model,
                  color: "purple",
                },
              ].map(({ label, icon: Icon, ok, detail, color }) => (
                <div key={label} className="px-4 py-3 bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={`text-${color}-400`} />
                    <span className="text-sm text-white">{label}</span>
                    <StatusDot ok={!!ok} />
                  </div>
                  <p className={clsx("text-xs", ok ? "text-green-400" : "text-red-400")}>
                    {ok ? "Configurado" : "Não configurado"}
                  </p>
                  {detail && <p className="text-xs text-slate-400 mt-0.5 truncate">{detail}</p>}
                </div>
              ))}
            </div>
          </section>

          {/* Runtime Config */}
          {settings && (
            <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Clock size={16} className="text-orange-400" />
                Configuração de Processamento
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Intervalo de Verificação", value: `${settings.check_interval_seconds}s` },
                  { label: "E-mails por Ciclo", value: settings.max_emails_per_batch },
                  { label: "Tam. Máx. Anexo", value: `${settings.max_attachment_size_mb} MB` },
                  { label: "Retenção de Logs", value: `${settings.log_retention_days} dias` },
                  { label: "Ambiente", value: settings.environment },
                  { label: "Versão", value: settings.app_version },
                  { label: "Provedor WhatsApp", value: settings.whatsapp_provider },
                  { label: "Modelo Claude", value: settings.claude_model },
                ].map(({ label, value }) => (
                  <div key={label} className="px-3 py-2.5 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase">{label}</p>
                    <p className="text-sm text-slate-200 mt-0.5 font-mono">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Play size={16} className="text-green-400" />
              Ações Manuais
            </h2>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-64 bg-slate-700/50 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-1">Verificação de E-mails</p>
                <p className="text-xs text-slate-400 mb-3">
                  Dispara imediatamente uma verificação de novos e-mails no Outlook.
                </p>
                <button
                  onClick={() => triggerCheckMut.mutate()}
                  disabled={triggerCheckMut.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                >
                  <Play size={14} />
                  {triggerCheckMut.isPending ? "Iniciando..." : "Verificar Agora"}
                </button>
                {taskId && (
                  <p className="text-xs text-slate-400 mt-2 font-mono">Task: {taskId}</p>
                )}
              </div>
              <div className="flex-1 min-w-64 bg-slate-700/50 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-1">Resumo Diário</p>
                <p className="text-xs text-slate-400 mb-3">
                  Envia o resumo diário de e-mails via WhatsApp agora.
                </p>
                <button
                  onClick={() => triggerSummaryMut.mutate()}
                  disabled={triggerSummaryMut.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                >
                  <Send size={14} />
                  {triggerSummaryMut.isPending ? "Enviando..." : "Enviar Resumo"}
                </button>
              </div>
            </div>
          </section>

          {/* Keywords */}
          {settings?.priority_keywords && (
            <section className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <AlertCircle size={16} className="text-yellow-400" />
                Palavras-chave de Prioridade
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: "Crítico", keywords: settings.priority_keywords.critical, color: "red" },
                  { label: "Alto", keywords: settings.priority_keywords.high, color: "orange" },
                  { label: "Médio", keywords: settings.priority_keywords.medium, color: "yellow" },
                ].map(({ label, keywords, color }) => (
                  <div key={label}>
                    <p className={`text-xs font-semibold text-${color}-400 uppercase mb-2`}>{label}</p>
                    <div className="flex flex-wrap gap-1">
                      {keywords.map((kw) => (
                        <span key={kw} className={`text-xs px-2 py-0.5 bg-${color}-500/10 text-${color}-400 rounded`}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
