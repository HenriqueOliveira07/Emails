"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings, Zap, Database, MessageCircle, Brain, Clock,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Send,
} from "lucide-react";
import { clsx } from "clsx";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  fetchSettings, fetchHealth, fetchKeywords,
  triggerCheck, triggerDailySummary,
} from "@/lib/api";

function IntegrationCard({
  name,
  icon: Icon,
  status,
  detail,
  color,
}: {
  name: string;
  icon: React.ElementType;
  status: "ok" | "error" | "unknown";
  detail?: string;
  color: string;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center", color)}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{name}</p>
          {detail && <p className="text-xs text-slate-500">{detail}</p>}
        </div>
        {status === "ok" && <CheckCircle size={16} className="text-green-400 flex-shrink-0" />}
        {status === "error" && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
        {status === "unknown" && <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />}
      </div>
      <div
        className={clsx(
          "text-xs px-2 py-0.5 rounded-full inline-block",
          status === "ok" ? "bg-green-500/20 text-green-400" :
          status === "error" ? "bg-red-500/20 text-red-400" :
          "bg-yellow-500/20 text-yellow-400"
        )}
      >
        {status === "ok" ? "Conectado" : status === "error" ? "Com problemas" : "Não verificado"}
      </div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs text-white font-mono bg-slate-800 px-2 py-0.5 rounded">{String(value)}</span>
    </div>
  );
}

function KeywordBadge({ word }: { word: string }) {
  return (
    <span className="inline-block text-xs bg-slate-800 text-slate-300 border border-slate-600 rounded px-2 py-0.5 m-0.5">
      {word}
    </span>
  );
}

export default function SettingsPage() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
  });

  const triggerMutation = useMutation({
    mutationFn: triggerCheck,
  });

  const summaryMutation = useMutation({
    mutationFn: triggerDailySummary,
  });

  const dbOk = health?.database === "ok";
  const redisOk = health?.redis === "ok";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Integrações */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Zap size={14} className="text-blue-400" />
              Status das Integrações
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <IntegrationCard
                name="PostgreSQL"
                icon={Database}
                status={dbOk ? "ok" : "error"}
                detail="Banco de dados principal"
                color="bg-blue-600"
              />
              <IntegrationCard
                name="Redis"
                icon={Zap}
                status={redisOk ? "ok" : "error"}
                detail="Cache e fila Celery"
                color="bg-red-600"
              />
              <IntegrationCard
                name="Microsoft Outlook"
                icon={Settings}
                status={settings?.outlook_email ? "ok" : "unknown"}
                detail={settings?.outlook_email || "Não configurado"}
                color="bg-blue-700"
              />
              <IntegrationCard
                name="WhatsApp"
                icon={MessageCircle}
                status={settings?.whatsapp_to_number ? "ok" : "unknown"}
                detail={`Provedor: ${settings?.whatsapp_provider || "—"}`}
                color="bg-green-600"
              />
              <IntegrationCard
                name="Claude AI"
                icon={Brain}
                status="ok"
                detail={settings?.claude_model || "—"}
                color="bg-purple-600"
              />
            </div>
          </section>

          {/* Configuração do sistema */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Settings size={14} className="text-slate-400" />
              Configuração do Sistema
            </h2>
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
              {settings ? (
                <>
                  <ConfigItem label="Nome da aplicação" value={settings.app_name} />
                  <ConfigItem label="Versão" value={settings.app_version} />
                  <ConfigItem label="Ambiente" value={settings.environment} />
                  <ConfigItem label="Intervalo de verificação" value={`${settings.check_interval_seconds}s`} />
                  <ConfigItem label="E-mails por ciclo (máx)" value={settings.max_emails_per_batch} />
                  <ConfigItem label="Modelo Claude" value={settings.claude_model} />
                  <ConfigItem label="Retenção de logs" value={`${settings.log_retention_days} dias`} />
                  <ConfigItem label="Provedor WhatsApp" value={settings.whatsapp_provider} />
                  <ConfigItem label="Destinatário WhatsApp" value={settings.whatsapp_to_number || "Não configurado"} />
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">Carregando configurações...</p>
              )}
            </div>
          </section>

          {/* Palavras-chave */}
          {keywords && (
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-400" />
                Palavras-chave de Prioridade
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Crítico", key: "critical", color: "text-red-400" },
                  { label: "Alto", key: "high", color: "text-orange-400" },
                  { label: "Médio", key: "medium", color: "text-yellow-400" },
                  { label: "Spam", key: "spam", color: "text-slate-400" },
                ].map(({ label, key, color }) => (
                  <div key={key} className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                    <p className={clsx("text-xs font-semibold mb-2", color)}>{label}</p>
                    <div className="flex flex-wrap">
                      {(keywords[key] ?? []).map((kw: string) => (
                        <KeywordBadge key={kw} word={kw} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ações manuais */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Clock size={14} className="text-blue-400" />
              Ações Manuais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                <p className="text-sm font-semibold text-white mb-1">Verificar E-mails Agora</p>
                <p className="text-xs text-slate-500 mb-3">
                  Dispara imediatamente um ciclo de verificação de novos e-mails.
                </p>
                <button
                  onClick={() => triggerMutation.mutate()}
                  disabled={triggerMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <RefreshCw size={14} className={triggerMutation.isPending ? "animate-spin" : ""} />
                  {triggerMutation.isPending ? "Verificando..." : "Verificar agora"}
                </button>
                {triggerMutation.isSuccess && (
                  <p className="text-xs text-green-400 mt-2">Tarefa disparada com sucesso!</p>
                )}
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                <p className="text-sm font-semibold text-white mb-1">Enviar Resumo Diário</p>
                <p className="text-xs text-slate-500 mb-3">
                  Envia imediatamente o resumo do dia via WhatsApp.
                </p>
                <button
                  onClick={() => summaryMutation.mutate()}
                  disabled={summaryMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Send size={14} />
                  {summaryMutation.isPending ? "Enviando..." : "Enviar resumo"}
                </button>
                {summaryMutation.isSuccess && (
                  <p className="text-xs text-green-400 mt-2">Resumo enviado com sucesso!</p>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
