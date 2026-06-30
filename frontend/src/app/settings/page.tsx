"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, Play, Calendar } from "lucide-react";

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

function IntegrationStatus({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      {ok ? (
        <span className="flex items-center gap-1.5 text-green-400 text-xs">
          <CheckCircle size={13} /> Configurado
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-red-400 text-xs">
          <XCircle size={13} /> Não configurado
        </span>
      )}
    </div>
  );
}

function KeywordList({ keywords, color }: { keywords: string[]; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {keywords.map((kw) => (
        <span key={kw} className={`px-2 py-0.5 rounded text-xs ${color}`}>{kw}</span>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const checkMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-check"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Configurações" />
          <main className="flex-1 p-6 text-slate-400">Carregando...</main>
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
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Info do sistema */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Informações do Sistema</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ["Aplicação", settings?.app_name],
                  ["Versão", settings?.app_version],
                  ["Ambiente", settings?.environment],
                  ["Modelo Claude", settings?.claude_model],
                  ["Provedor WhatsApp", settings?.whatsapp_provider],
                  ["Intervalo de verificação", `${settings?.check_interval_seconds}s`],
                  ["Máx. e-mails por ciclo", String(settings?.max_emails_per_batch)],
                  ["Tamanho máx. anexo", `${settings?.max_attachment_size_mb} MB`],
                  ["Retenção de logs", `${settings?.log_retention_days} dias`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-slate-700 pb-2 last:border-0 last:pb-0">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="text-slate-200 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Status das integrações */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Status das Integrações</h3>
              <IntegrationStatus
                label="Microsoft Outlook / Azure AD"
                ok={settings?.integrations.outlook_configured ?? false}
                detail={settings?.integrations.email_address}
              />
              <IntegrationStatus
                label="WhatsApp"
                ok={settings?.integrations.whatsapp_configured ?? false}
                detail={settings?.integrations.whatsapp_to}
              />
              <IntegrationStatus
                label="Claude AI (Anthropic)"
                ok={settings?.integrations.claude_configured ?? false}
                detail={settings?.claude_model}
              />
            </div>
          </div>

          {/* Ações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Ações Manuais</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => checkMutation.mutate()}
                disabled={checkMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
              >
                <Play size={14} />
                {checkMutation.isPending ? "Verificando..." : "Verificar E-mails Agora"}
              </button>
              <button
                onClick={() => summaryMutation.mutate()}
                disabled={summaryMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
              >
                <Calendar size={14} />
                {summaryMutation.isPending ? "Enviando..." : "Enviar Resumo Diário"}
              </button>
            </div>
            {checkMutation.isSuccess && (
              <p className="text-xs text-green-400 mt-2">Verificação disparada com sucesso!</p>
            )}
            {summaryMutation.isSuccess && (
              <p className="text-xs text-green-400 mt-2">Resumo diário enviado com sucesso!</p>
            )}
          </div>

          {/* Palavras-chave */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-red-400">CRÍTICO</p>
                <KeywordList
                  keywords={settings?.priority_keywords.critical ?? []}
                  color="bg-red-500/20 text-red-400 border border-red-500/30"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-orange-400">ALTO</p>
                <KeywordList
                  keywords={settings?.priority_keywords.high ?? []}
                  color="bg-orange-500/20 text-orange-400 border border-orange-500/30"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-yellow-400">MÉDIO</p>
                <KeywordList
                  keywords={settings?.priority_keywords.medium ?? []}
                  color="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
