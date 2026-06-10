"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSystemSettings, triggerCheck, triggerSummary, SystemSettings } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, PlayCircle, Send, Settings2,
  Key, Mail, MessageCircle, Brain, Tag,
} from "lucide-react";
import { clsx } from "clsx";

function IntegrationStatus({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <CheckCircle size={14} className="text-green-400 shrink-0" />
        : <XCircle size={14} className="text-red-400 shrink-0" />}
      <span className={clsx("text-sm", ok ? "text-green-400" : "text-red-400")}>{label}</span>
    </div>
  );
}

function KeywordBadge({ word }: { word: string }) {
  return (
    <span className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 font-mono">
      {word}
    </span>
  );
}

export default function SettingsPage() {
  const [triggerMsg, setTriggerMsg] = useState("");
  const [summaryMsg, setSummaryMsg] = useState("");

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["system-settings"],
    queryFn: fetchSystemSettings,
    refetchInterval: 60_000,
  });

  const check = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => setTriggerMsg(`Iniciado! Task ID: ${data.task_id}`),
    onError: () => setTriggerMsg("Erro ao disparar verificação"),
  });

  const summary = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (data) => setSummaryMsg(`Enviando! Task ID: ${data.task_id}`),
    onError: () => setSummaryMsg("Erro ao enviar resumo"),
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

  const integ = settings?.integrations;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* App info */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Informações do Sistema</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Versão", value: settings?.app_version },
                { label: "Ambiente", value: settings?.environment },
                { label: "Modelo IA", value: settings?.claude_model },
                { label: "Provedor WhatsApp", value: settings?.whatsapp_provider },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-900/50 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-sm font-medium text-white font-mono">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrations status */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Status das Integrações</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <IntegrationStatus
                  ok={!!integ?.outlook_configured}
                  label={`Outlook/Azure AD — ${integ?.email_address || "não configurado"}`}
                />
                <IntegrationStatus
                  ok={!!integ?.claude_configured}
                  label={`Claude (Anthropic) — modelo: ${settings?.claude_model}`}
                />
                <IntegrationStatus
                  ok={!!integ?.whatsapp_configured}
                  label={`WhatsApp — destino: ${integ?.whatsapp_to || "não configurado"}`}
                />
              </div>
              <div className="space-y-2 bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium">Parâmetros de Processamento</p>
                <div className="space-y-1">
                  {[
                    { label: "Intervalo de verificação", value: `${settings?.check_interval_seconds}s` },
                    { label: "Máx. e-mails por ciclo", value: String(settings?.max_emails_per_batch) },
                    { label: "Tamanho máx. de anexo", value: `${settings?.max_attachment_size_mb} MB` },
                    { label: "Retenção de logs", value: `${settings?.log_retention_days} dias` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-200 font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Manual triggers */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle size={16} className="text-green-400" />
              <h3 className="text-sm font-semibold text-white">Ações Manuais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-blue-400" />
                  <p className="text-sm font-medium text-white">Verificar E-mails Agora</p>
                </div>
                <p className="text-xs text-slate-400">
                  Dispara imediatamente um ciclo de verificação de novos e-mails, sem aguardar o agendamento automático.
                </p>
                <button
                  onClick={() => { check.mutate(); setTriggerMsg(""); }}
                  disabled={check.isPending}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors"
                >
                  {check.isPending ? "Disparando..." : "Verificar Agora"}
                </button>
                {triggerMsg && (
                  <p className="text-xs text-green-400 font-mono">{triggerMsg}</p>
                )}
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send size={14} className="text-purple-400" />
                  <p className="text-sm font-medium text-white">Enviar Resumo Diário</p>
                </div>
                <p className="text-xs text-slate-400">
                  Envia imediatamente o resumo diário de e-mails via WhatsApp com estatísticas do dia atual.
                </p>
                <button
                  onClick={() => { summary.mutate(); setSummaryMsg(""); }}
                  disabled={summary.isPending}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors"
                >
                  {summary.isPending ? "Enviando..." : "Enviar Resumo"}
                </button>
                {summaryMsg && (
                  <p className="text-xs text-green-400 font-mono">{summaryMsg}</p>
                )}
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={16} className="text-yellow-400" />
              <h3 className="text-sm font-semibold text-white">Palavras-chave de Classificação</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: "CRÍTICO", color: "text-red-400", words: settings?.priority_keywords?.critical ?? [] },
                { label: "ALTO", color: "text-orange-400", words: settings?.priority_keywords?.high ?? [] },
                { label: "MÉDIO", color: "text-yellow-400", words: settings?.priority_keywords?.medium ?? [] },
              ].map(({ label, color, words }) => (
                <div key={label}>
                  <p className={clsx("text-xs font-semibold mb-2", color)}>{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {words.map((w) => <KeywordBadge key={w} word={w} />)}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Para modificar as palavras-chave, edite as variáveis{" "}
              <code className="font-mono text-blue-400">PRIORITY_*_KEYWORDS</code>{" "}
              no arquivo <code className="font-mono text-blue-400">.env</code> e reinicie os containers.
            </p>
          </div>

          {/* Claude AI info */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Inteligência Artificial</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                { title: "Classificação de E-mails", desc: "Claude analisa remetente, assunto e corpo para determinar prioridade (CRÍTICO/ALTO/MÉDIO/BAIXO), categoria e resumo inteligente." },
                { title: "Extração de Dados", desc: "Identifica automaticamente boletos, notas fiscais e contratos, extraindo dados como valor, vencimento e CNPJ." },
                { title: "Resumo de PDFs", desc: "Gera resumos objetivos de documentos PDF anexados, com foco em informações corporativas relevantes." },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-white font-medium mb-1">{title}</p>
                  <p className="text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Setup hint */}
          <div className="bg-blue-950/40 border border-blue-700/30 rounded-xl p-4">
            <p className="text-xs text-blue-300 font-medium mb-1">Configuração via .env</p>
            <p className="text-xs text-blue-400/80">
              Todas as credenciais e parâmetros são configurados via variáveis de ambiente no arquivo{" "}
              <code className="font-mono bg-blue-900/30 px-1 rounded">.env</code>.
              Consulte o <code className="font-mono bg-blue-900/30 px-1 rounded">.env.example</code> para
              referência completa. Reinicie os containers após qualquer alteração.
            </p>
          </div>

        </main>
      </div>
    </div>
  );
}
