"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchSystemSettings,
  fetchKeywords,
  triggerCheck,
  triggerDailySummary,
  SystemSettings,
} from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  Mail,
  Brain,
  Settings,
  Key,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";

function IntegrationCard({
  name,
  icon: Icon,
  configured,
  detail,
}: {
  name: string;
  icon: React.ElementType;
  configured: boolean;
  detail?: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
      <div
        className={clsx(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          configured ? "bg-green-500/20" : "bg-red-500/20"
        )}
      >
        <Icon size={18} className={configured ? "text-green-400" : "text-red-400"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white font-medium text-sm">{name}</span>
          {configured ? (
            <CheckCircle size={13} className="text-green-400" />
          ) : (
            <XCircle size={13} className="text-red-400" />
          )}
        </div>
        <p className="text-slate-400 text-xs">{detail ?? (configured ? "Configurado" : "Não configurado")}</p>
      </div>
    </div>
  );
}

function KeywordList({ title, keywords, color }: { title: string; keywords: string[]; color: string }) {
  return (
    <div>
      <p className={clsx("text-xs font-medium mb-2", color)}>{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <span key={kw} className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [summaryMsg, setSummaryMsg] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["system-settings"],
    queryFn: fetchSystemSettings,
    staleTime: 60_000,
  });

  const { data: keywords } = useQuery<Record<string, string[]>>({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
    staleTime: 60_000,
  });

  const triggerCheckMut = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (res) => setCheckMsg(res.message),
  });

  const triggerSummaryMut = useMutation({
    mutationFn: triggerDailySummary,
    onSuccess: (res) => setSummaryMsg(res.message),
  });

  if (isLoading || !settings) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Configurações" />
          <main className="flex-1 p-6 text-slate-400 text-center py-20">Carregando...</main>
        </div>
      </div>
    );
  }

  const { integrations } = settings;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Integrations */}
          <section>
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Key size={16} className="text-blue-400" />
              Status das Integrações
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IntegrationCard
                name="Microsoft Outlook"
                icon={Mail}
                configured={integrations.outlook_configured}
                detail={
                  integrations.outlook_configured
                    ? integrations.email_address
                    : "Credenciais Azure AD não configuradas"
                }
              />
              <IntegrationCard
                name="WhatsApp"
                icon={MessageCircle}
                configured={integrations.whatsapp_configured}
                detail={
                  integrations.whatsapp_configured
                    ? `Provedor: ${settings.whatsapp_provider.toUpperCase()} · Para: ${integrations.whatsapp_to}`
                    : "Número de destino não configurado"
                }
              />
              <IntegrationCard
                name="Claude AI"
                icon={Brain}
                configured={integrations.claude_configured}
                detail={
                  integrations.claude_configured
                    ? `Modelo: ${settings.claude_model}`
                    : "API Key não configurada"
                }
              />
            </div>
          </section>

          {/* System config */}
          <section>
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Settings size={16} className="text-blue-400" />
              Configurações do Sistema
            </h2>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {[
                  { label: "Intervalo de verificação", value: `${settings.check_interval_seconds}s`, icon: Clock },
                  { label: "E-mails por ciclo", value: `${settings.max_emails_per_batch}`, icon: Mail },
                  { label: "Tamanho máx. anexo", value: `${settings.max_attachment_size_mb} MB`, icon: Settings },
                  { label: "Modelo IA", value: settings.claude_model, icon: Brain },
                  { label: "Retenção de logs", value: `${settings.log_retention_days} dias`, icon: Clock },
                  { label: "Ambiente", value: settings.environment, icon: Settings },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={13} className="text-slate-400" />
                      <p className="text-slate-400 text-xs">{label}</p>
                    </div>
                    <p className="text-white text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Manual triggers */}
          <section>
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <RefreshCw size={16} className="text-blue-400" />
              Ações Manuais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-medium text-sm mb-1">Verificar E-mails Agora</h3>
                <p className="text-slate-400 text-xs mb-4">
                  Dispara imediatamente uma verificação de novos e-mails no Outlook.
                </p>
                {checkMsg && (
                  <p className="text-green-400 text-xs mb-2">{checkMsg}</p>
                )}
                <button
                  onClick={() => { setCheckMsg(null); triggerCheckMut.mutate(); }}
                  disabled={triggerCheckMut.isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <RefreshCw size={13} className={triggerCheckMut.isPending ? "animate-spin" : ""} />
                  {triggerCheckMut.isPending ? "Iniciando..." : "Verificar Agora"}
                </button>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-medium text-sm mb-1">Enviar Resumo Diário</h3>
                <p className="text-slate-400 text-xs mb-4">
                  Envia o resumo diário de e-mails processados via WhatsApp.
                </p>
                {summaryMsg && (
                  <p className="text-green-400 text-xs mb-2">{summaryMsg}</p>
                )}
                <button
                  onClick={() => { setSummaryMsg(null); triggerSummaryMut.mutate(); }}
                  disabled={triggerSummaryMut.isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <MessageCircle size={13} />
                  {triggerSummaryMut.isPending ? "Enviando..." : "Enviar Resumo"}
                </button>
              </div>
            </div>
          </section>

          {/* Priority keywords */}
          {keywords && (
            <section>
              <h2 className="text-white font-semibold mb-3">Palavras-chave de Prioridade</h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
                <KeywordList
                  title="CRÍTICO"
                  keywords={keywords.CRITICO ?? []}
                  color="text-red-400"
                />
                <KeywordList
                  title="ALTO"
                  keywords={keywords.ALTO ?? []}
                  color="text-orange-400"
                />
                <KeywordList
                  title="MÉDIO"
                  keywords={keywords.MEDIO ?? []}
                  color="text-yellow-400"
                />
                <KeywordList
                  title="SPAM / IGNORAR"
                  keywords={keywords.spam ?? []}
                  color="text-slate-400"
                />
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
