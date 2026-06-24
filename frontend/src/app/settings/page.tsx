"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { api } from "@/lib/api";
import {
  Settings, RefreshCw, Play, AlertCircle, CheckCircle, Clock,
} from "lucide-react";

interface SystemConfig {
  app_name: string;
  version: string;
  environment: string;
  check_interval_seconds: number;
  max_emails_per_batch: number;
  max_attachment_size_mb: number;
  claude_model: string;
  whatsapp_provider: string;
  outlook_email_address: string;
}

interface KeywordsConfig {
  critical: string[];
  high: string[];
  medium: string[];
  spam: string[];
}

export default function SettingsPage() {
  const [triggerStatus, setTriggerStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const { data: config, isLoading: loadingConfig } = useQuery<SystemConfig>({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const { data: keywords } = useQuery<KeywordsConfig>({
    queryKey: ["keywords"],
    queryFn: () => api.get("/settings/keywords").then((r) => r.data),
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get("/dashboard/health").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-check"),
    onMutate: () => setTriggerStatus("loading"),
    onSuccess: () => { setTriggerStatus("success"); setTimeout(() => setTriggerStatus("idle"), 3000); },
    onError: () => { setTriggerStatus("error"); setTimeout(() => setTriggerStatus("idle"), 3000); },
  });

  const summaryMutation = useMutation({
    mutationFn: () => api.post("/settings/trigger-summary"),
  });

  const ServiceStatus = ({ name, status }: { name: string; status?: { status: string } }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
      <span className="text-slate-300 text-sm">{name}</span>
      {status?.status === "ok" ? (
        <span className="flex items-center gap-1 text-green-400 text-xs">
          <CheckCircle size={12} /> Online
        </span>
      ) : (
        <span className="flex items-center gap-1 text-red-400 text-xs">
          <AlertCircle size={12} /> Offline
        </span>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Informações do Sistema */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h2 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                <Settings size={16} /> Configurações do Sistema
              </h2>
              {loadingConfig ? (
                <div className="text-slate-400 text-sm">Carregando...</div>
              ) : config ? (
                <div className="space-y-3">
                  {[
                    ["Versão", config.version],
                    ["Ambiente", config.environment],
                    ["Intervalo de verificação", `${config.check_interval_seconds}s`],
                    ["E-mails por ciclo", config.max_emails_per_batch],
                    ["Tamanho máx. anexo", `${config.max_attachment_size_mb} MB`],
                    ["Modelo IA", config.claude_model],
                    ["Provedor WhatsApp", config.whatsapp_provider],
                    ["E-mail monitorado", config.outlook_email_address || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between border-b border-slate-700 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <span className="text-slate-200 text-sm font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Status dos Serviços */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h2 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                <CheckCircle size={16} /> Status dos Serviços
              </h2>
              <ServiceStatus name="PostgreSQL" status={health?.services?.postgresql} />
              <ServiceStatus name="Redis" status={health?.services?.redis} />
              <div className="mt-4 pt-3 border-t border-slate-700">
                <span className="text-slate-400 text-xs">Status geral: </span>
                <span className={`text-xs font-semibold ${health?.overall === "ok" ? "text-green-400" : "text-yellow-400"}`}>
                  {health?.overall === "ok" ? "✓ Operacional" : "⚠ Degradado"}
                </span>
              </div>
            </div>

            {/* Ações Manuais */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h2 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                <Play size={16} /> Ações Manuais
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => triggerMutation.mutate()}
                  disabled={triggerStatus === "loading"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-60 transition-colors"
                >
                  {triggerStatus === "loading" ? (
                    <><RefreshCw size={14} className="animate-spin" /> Verificando...</>
                  ) : triggerStatus === "success" ? (
                    <><CheckCircle size={14} /> Tarefa enfileirada!</>
                  ) : triggerStatus === "error" ? (
                    <><AlertCircle size={14} /> Erro ao acionar</>
                  ) : (
                    <><RefreshCw size={14} /> Verificar e-mails agora</>
                  )}
                </button>
                <button
                  onClick={() => summaryMutation.mutate()}
                  disabled={summaryMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium disabled:opacity-60 transition-colors"
                >
                  {summaryMutation.isPending ? (
                    <><Clock size={14} className="animate-spin" /> Enviando...</>
                  ) : (
                    <><Play size={14} /> Enviar resumo diário agora</>
                  )}
                </button>
              </div>
            </div>

            {/* Palavras-chave */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h2 className="text-slate-200 font-semibold mb-4">Palavras-chave de Classificação</h2>
              {keywords ? (
                <div className="space-y-3 text-xs">
                  {[
                    { label: "🔴 Crítico", kws: keywords.critical, color: "bg-red-900/40 text-red-300" },
                    { label: "🟠 Alto", kws: keywords.high, color: "bg-orange-900/40 text-orange-300" },
                    { label: "🟡 Médio", kws: keywords.medium, color: "bg-yellow-900/40 text-yellow-300" },
                    { label: "🚫 Spam", kws: keywords.spam, color: "bg-slate-700 text-slate-400" },
                  ].map(({ label, kws, color }) => (
                    <div key={label}>
                      <div className="text-slate-400 mb-1">{label}</div>
                      <div className="flex flex-wrap gap-1">
                        {kws.slice(0, 12).map((kw) => (
                          <span key={kw} className={`px-2 py-0.5 rounded-full ${color}`}>{kw}</span>
                        ))}
                        {kws.length > 12 && (
                          <span className="text-slate-500 px-2 py-0.5">+{kws.length - 12} mais</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-sm">Carregando...</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
