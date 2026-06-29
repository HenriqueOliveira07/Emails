"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings, fetchKeywords, fetchHealth, triggerCheck, triggerSummary, SettingsData, HealthData } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  CheckCircle, XCircle, Settings, Zap, Clock, Database, MessageCircle, Mail, Brain, Shield, RefreshCw, Send,
} from "lucide-react";
import { useState } from "react";

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} />Configurado</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} />Nao configurado</span>
  );
}

function ServiceStatus({ name, status }: { name: string; status?: { status: string; error?: string } }) {
  const ok = status?.status === "ok";
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg">
      <span className="text-sm text-slate-300">{name}</span>
      {ok ? (
        <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} />Online</span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} />{status?.error || "Offline"}</span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [triggering, setTriggering] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
  });

  const { data: health } = useQuery<HealthData>({
    queryKey: ["health-settings"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const handleTrigger = async () => {
    setTriggering(true);
    try { await triggerCheck(); } finally { setTriggering(false); }
  };

  const handleSummary = async () => {
    setSendingSummary(true);
    try { await triggerSummary(); } finally { setSendingSummary(false); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configuracoes" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Quick Actions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" /> Acoes Rapidas
            </h3>
            <div className="flex gap-3">
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white"
              >
                <RefreshCw size={14} className={triggering ? "animate-spin" : ""} />
                {triggering ? "Verificando..." : "Verificar E-mails Agora"}
              </button>
              <button
                onClick={handleSummary}
                disabled={sendingSummary}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white"
              >
                <Send size={14} />
                {sendingSummary ? "Enviando..." : "Enviar Resumo Diario"}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* System Info */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings size={16} className="text-slate-400" /> Sistema
              </h3>
              <div className="space-y-2 text-sm">
                <Row label="Aplicacao" value={settings?.app_name ?? "--"} />
                <Row label="Versao" value={settings?.app_version ?? "--"} />
                <Row label="Ambiente" value={settings?.environment ?? "--"} />
                <Row label="Modelo IA" value={settings?.claude_model ?? "--"} />
              </div>
            </div>

            {/* Processing */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-400" /> Processamento
              </h3>
              <div className="space-y-2 text-sm">
                <Row label="Intervalo de verificacao" value={`${settings?.check_interval_seconds ?? 60}s`} />
                <Row label="Max e-mails/ciclo" value={String(settings?.max_emails_per_batch ?? 25)} />
                <Row label="Max tamanho anexo" value={`${settings?.max_attachment_size_mb ?? 25} MB`} />
                <Row label="Retencao de logs" value={`${settings?.log_retention_days ?? 90} dias`} />
              </div>
            </div>

            {/* Integrations */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield size={16} className="text-purple-400" /> Integracoes
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <Mail size={14} className="text-blue-400" /> Outlook 365
                  </span>
                  <StatusBadge ok={settings?.integrations?.outlook_configured ?? false} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <MessageCircle size={14} className="text-green-400" /> WhatsApp ({settings?.whatsapp_provider ?? "twilio"})
                  </span>
                  <StatusBadge ok={settings?.integrations?.whatsapp_configured ?? false} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <Brain size={14} className="text-orange-400" /> Claude AI
                  </span>
                  <StatusBadge ok={settings?.integrations?.claude_configured ?? false} />
                </div>
                <div className="mt-2 pt-2 border-t border-slate-700 space-y-1 text-xs text-slate-400">
                  <p>E-mail monitorado: {settings?.integrations?.email_address ?? "--"}</p>
                  <p>WhatsApp destino: {settings?.integrations?.whatsapp_to ?? "--"}</p>
                </div>
              </div>
            </div>

            {/* Health */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Database size={16} className="text-cyan-400" /> Saude dos Servicos
              </h3>
              <div className="space-y-2">
                <ServiceStatus name="PostgreSQL" status={health?.services?.postgresql} />
                <ServiceStatus name="Redis" status={health?.services?.redis} />
                <div className="flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg">
                  <span className="text-sm text-slate-300">Status Geral</span>
                  <span className={`text-xs font-medium ${health?.overall === "ok" ? "text-green-400" : "text-red-400"}`}>
                    {health?.overall === "ok" ? "Saudavel" : "Degradado"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Keywords */}
          {keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Palavras-chave de Prioridade</h3>
              <div className="grid lg:grid-cols-3 gap-4">
                {Object.entries(keywords).map(([level, words]) => (
                  <div key={level} className="space-y-2">
                    <h4 className={`text-xs font-medium uppercase ${
                      level === "CRITICO" ? "text-red-400" :
                      level === "ALTO" ? "text-orange-400" :
                      level === "MEDIO" ? "text-yellow-400" :
                      "text-slate-400"
                    }`}>{level}</h4>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w: string) => (
                        <span key={w} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded-md">{w}</span>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 px-3 bg-slate-900/50 rounded-lg">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
