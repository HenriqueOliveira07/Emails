"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSettings, fetchKeywords, triggerCheck, triggerSummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Play, Send, Mail, MessageCircle,
  Brain, Settings as SettingsIcon, Key, Clock, Shield,
} from "lucide-react";

const StatusBadge = ({ ok }: { ok: boolean }) =>
  ok ? (
    <span className="flex items-center gap-1 text-xs text-green-400">
      <CheckCircle size={12} /> Configurado
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <XCircle size={12} /> Não configurado
    </span>
  );

export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null);

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
  });

  const triggerCheckMutation = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (d) => showToast(`Tarefa ${d.task_id.slice(0, 8)}... enfileirada`),
    onError: () => showToast("Erro ao disparar verificação"),
  });

  const triggerSummaryMutation = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (d) => showToast(`Resumo diário enfileirado — ID: ${d.task_id.slice(0, 8)}...`),
    onError: () => showToast("Erro ao disparar resumo"),
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  if (loadingSettings) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Carregando configurações...</p>
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

          {toast && (
            <div className="fixed top-4 right-4 z-50 bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-lg text-sm shadow-lg max-w-sm">
              {toast}
            </div>
          )}

          {/* Ações manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Play size={14} className="text-blue-400" />
              Ações Manuais
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => triggerCheckMutation.mutate()}
                disabled={triggerCheckMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <Play size={14} />
                {triggerCheckMutation.isPending ? "Enfileirando..." : "Verificar E-mails Agora"}
              </button>
              <button
                onClick={() => triggerSummaryMutation.mutate()}
                disabled={triggerSummaryMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <Send size={14} />
                {triggerSummaryMutation.isPending ? "Enviando..." : "Enviar Resumo Diário"}
              </button>
            </div>
          </div>

          {/* Status das integrações */}
          {settings && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Shield size={14} className="text-blue-400" />
                Status das Integrações
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail size={16} className="text-blue-400" />
                    <span className="text-sm font-medium text-white">Outlook / Azure AD</span>
                  </div>
                  <StatusBadge ok={settings.integrations.outlook_configured} />
                  <p className="text-xs text-slate-500">
                    E-mail: {settings.integrations.email_address}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle size={16} className="text-green-400" />
                    <span className="text-sm font-medium text-white">WhatsApp</span>
                  </div>
                  <StatusBadge ok={settings.integrations.whatsapp_configured} />
                  <p className="text-xs text-slate-500">
                    Provedor: {settings.whatsapp_provider.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Destino: {settings.integrations.whatsapp_to}
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain size={16} className="text-purple-400" />
                    <span className="text-sm font-medium text-white">Claude AI</span>
                  </div>
                  <StatusBadge ok={settings.integrations.claude_configured} />
                  <p className="text-xs text-slate-500">Modelo: {settings.claude_model}</p>
                </div>
              </div>
            </div>
          )}

          {/* Parâmetros do sistema */}
          {settings && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <SettingsIcon size={14} className="text-blue-400" />
                Parâmetros do Sistema
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Versão", value: settings.app_version, icon: Key },
                  { label: "Ambiente", value: settings.environment, icon: Shield },
                  { label: "Intervalo de verificação", value: `${settings.check_interval_seconds}s`, icon: Clock },
                  { label: "E-mails por ciclo", value: settings.max_emails_per_batch, icon: Mail },
                  { label: "Tamanho máx. anexo", value: `${settings.max_attachment_size_mb} MB`, icon: Key },
                  { label: "Retenção de logs", value: `${settings.log_retention_days} dias`, icon: Clock },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-slate-900/60 rounded-lg p-3 flex items-start gap-3">
                    <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm font-medium text-white mt-0.5">{String(value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Palavras-chave */}
          {keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Key size={14} className="text-blue-400" />
                Palavras-chave de Prioridade
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries({
                  CRITICO: { label: "Crítico", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
                  ALTO: { label: "Alto", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
                  MEDIO: { label: "Médio", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
                  spam: { label: "Spam / Ignorar", cls: "bg-slate-700 text-slate-400 border-slate-600" },
                }).map(([key, { label, cls }]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-slate-300 mb-2">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(keywords[key] ?? []).map((kw) => (
                        <span
                          key={kw}
                          className={`text-xs px-2 py-0.5 rounded border ${cls}`}
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
