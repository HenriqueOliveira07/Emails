"use client";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { api, triggerCheck, triggerSummary } from "@/lib/api";
import { useState } from "react";
import {
  Settings, RefreshCw, Mail, MessageCircle, Database,
  CheckCircle, XCircle, Wifi, WifiOff,
} from "lucide-react";

interface SystemSettings {
  check_interval_seconds: number;
  max_emails_per_batch: number;
  attachments_base_path: string;
  max_attachment_size_mb: number;
  claude_model: string;
  whatsapp_provider: string;
  environment: string;
  app_version: string;
}

interface HealthStatus {
  overall: string;
  services: Record<string, { status: string; error?: string }>;
}

function SettingRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-white font-mono">{String(value)}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [triggeringCheck, setTriggeringCheck] = useState(false);
  const [triggeringSummary, setTriggeringSummary] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: health, refetch: refetchHealth } = useQuery<HealthStatus>({
    queryKey: ["health-full"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 60_000,
  });

  async function handleTriggerCheck() {
    setTriggeringCheck(true);
    try {
      await triggerCheck();
      setLastAction("Verificação de e-mails iniciada!");
      refetchHealth();
    } catch {
      setLastAction("Erro ao iniciar verificação.");
    } finally {
      setTriggeringCheck(false);
      setTimeout(() => setLastAction(null), 4000);
    }
  }

  async function handleTriggerSummary() {
    setTriggeringSummary(true);
    try {
      await triggerSummary();
      setLastAction("Resumo diário enviado!");
    } catch {
      setLastAction("Erro ao enviar resumo.");
    } finally {
      setTriggeringSummary(false);
      setTimeout(() => setLastAction(null), 4000);
    }
  }

  const allOk = health?.overall === "ok";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {lastAction && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-4 py-3 text-sm text-blue-300">
              {lastAction}
            </div>
          )}

          {/* Status das Integrações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              {allOk
                ? <Wifi size={16} className="text-green-400" />
                : <WifiOff size={16} className="text-red-400" />}
              <h3 className="text-sm font-semibold text-white">Status das Integrações</h3>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded ${allOk ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {allOk ? "Tudo OK" : "Degradado"}
              </span>
            </div>
            <div className="space-y-2">
              {health?.services && Object.entries(health.services).map(([name, svc]) => (
                <div key={name} className="flex items-center gap-2">
                  {svc.status === "ok"
                    ? <CheckCircle size={13} className="text-green-400" />
                    : <XCircle size={13} className="text-red-400" />}
                  <span className="text-sm text-slate-300 capitalize">{name}</span>
                  {svc.error && <span className="text-xs text-red-400 truncate">{svc.error}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Ações Manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={15} />
              Ações Manuais
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={handleTriggerCheck}
                disabled={triggeringCheck}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <Mail size={14} />
                <span>{triggeringCheck ? "Verificando..." : "Verificar E-mails Agora"}</span>
                {triggeringCheck && <RefreshCw size={12} className="animate-spin ml-auto" />}
              </button>
              <button
                onClick={handleTriggerSummary}
                disabled={triggeringSummary}
                className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <MessageCircle size={14} />
                <span>{triggeringSummary ? "Enviando..." : "Enviar Resumo Diário WhatsApp"}</span>
              </button>
            </div>
          </div>

          {/* Configurações do Sistema */}
          {settings && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Database size={15} />
                Configurações Ativas
              </h3>
              <div>
                <SettingRow label="Ambiente" value={settings.environment} />
                <SettingRow label="Versão" value={settings.app_version} />
                <SettingRow label="Modelo Claude" value={settings.claude_model} />
                <SettingRow label="Provedor WhatsApp" value={settings.whatsapp_provider} />
                <SettingRow label="Intervalo de verificação" value={`${settings.check_interval_seconds}s`} />
                <SettingRow label="E-mails por ciclo" value={settings.max_emails_per_batch} />
                <SettingRow label="Tamanho máx. anexo" value={`${settings.max_attachment_size_mb} MB`} />
                <SettingRow label="Pasta de anexos" value={settings.attachments_base_path} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
