"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Play, Send,
  Mail, MessageCircle, Brain, Database,
} from "lucide-react";
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

interface HealthData {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
}

const IntegrationCard = ({
  icon: Icon,
  title,
  configured,
  detail,
  color,
}: {
  icon: React.ElementType;
  title: string;
  configured: boolean;
  detail: string;
  color: string;
}) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
    <div className="flex items-start gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white">{title}</p>
          {configured ? (
            <CheckCircle size={14} className="text-green-400" />
          ) : (
            <XCircle size={14} className="text-red-400" />
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
        <span
          className={`mt-1 inline-block text-xs px-2 py-0.5 rounded font-medium ${
            configured
              ? "bg-green-500/15 text-green-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {configured ? "Configurado" : "Não configurado"}
        </span>
      </div>
    </div>
  </div>
);

export default function SettingsPage() {
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  const { data: cfg } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: health } = useQuery<HealthData>({
    queryKey: ["health-full"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const checkMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-check").then((r) => r.data),
    onSuccess: (data) => {
      setCheckResult(`Tarefa iniciada: ${data.task_id}`);
      setTimeout(() => setCheckResult(null), 5000);
    },
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary").then((r) => r.data),
    onSuccess: (data) => {
      setSummaryResult(`Tarefa iniciada: ${data.task_id}`);
      setTimeout(() => setSummaryResult(null), 5000);
    },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* App Info */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Informações do Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Versão", value: cfg?.app_version ?? "—" },
                { label: "Ambiente", value: cfg?.environment ?? "—" },
                { label: "Intervalo de verificação", value: cfg ? `${cfg.check_interval_seconds}s` : "—" },
                { label: "Retenção de logs", value: cfg ? `${cfg.log_retention_days} dias` : "—" },
                { label: "E-mails por ciclo", value: cfg?.max_emails_per_batch ?? "—" },
                { label: "Tamanho máx. anexo", value: cfg ? `${cfg.max_attachment_size_mb} MB` : "—" },
                { label: "Modelo IA", value: cfg?.claude_model ?? "—" },
                { label: "Provedor WhatsApp", value: cfg?.whatsapp_provider ?? "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Status das Integrações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <IntegrationCard
                icon={Mail}
                title="Microsoft Outlook"
                configured={cfg?.integrations.outlook_configured ?? false}
                detail={cfg?.integrations.email_address ?? "Não configurado"}
                color="bg-blue-500/20 text-blue-400"
              />
              <IntegrationCard
                icon={MessageCircle}
                title="WhatsApp"
                configured={cfg?.integrations.whatsapp_configured ?? false}
                detail={cfg?.integrations.whatsapp_to ?? "Não configurado"}
                color="bg-green-500/20 text-green-400"
              />
              <IntegrationCard
                icon={Brain}
                title="Claude AI"
                configured={cfg?.integrations.claude_configured ?? false}
                detail={cfg?.claude_model ?? "claude-sonnet-4-6"}
                color="bg-purple-500/20 text-purple-400"
              />
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Database size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white mb-2">Serviços de Infraestrutura</p>
                    {health?.services &&
                      Object.entries(health.services).map(([svc, info]) => (
                        <div key={svc} className="flex items-center gap-2 text-xs mb-1">
                          {info.status === "ok" ? (
                            <CheckCircle size={12} className="text-green-400" />
                          ) : (
                            <XCircle size={12} className="text-red-400" />
                          )}
                          <span className="text-slate-300 capitalize">{svc}</span>
                          {info.error && (
                            <span className="text-red-400 truncate">{info.error}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Ações Manuais</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <button
                  onClick={() => checkMutation.mutate()}
                  disabled={checkMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Play size={14} />
                  {checkMutation.isPending ? "Disparando..." : "Verificar E-mails Agora"}
                </button>
                {checkResult && <p className="text-xs text-green-400 mt-1">{checkResult}</p>}
              </div>
              <div>
                <button
                  onClick={() => summaryMutation.mutate()}
                  disabled={summaryMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Send size={14} />
                  {summaryMutation.isPending ? "Enviando..." : "Enviar Resumo Diário"}
                </button>
                {summaryResult && <p className="text-xs text-green-400 mt-1">{summaryResult}</p>}
              </div>
            </div>
          </div>

          {/* Keywords */}
          {cfg?.priority_keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(
                  [
                    { label: "Crítico", key: "critical", color: "bg-red-500/20 text-red-400 border-red-500/30" },
                    { label: "Alto", key: "high", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
                    { label: "Médio", key: "medium", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
                  ] as const
                ).map(({ label, key, color }) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cfg.priority_keywords[key].map((kw) => (
                        <span
                          key={kw}
                          className={`text-xs px-2 py-0.5 rounded border ${color}`}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
