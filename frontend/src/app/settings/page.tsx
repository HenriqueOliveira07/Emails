"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSettings, fetchHealth, triggerCheck, triggerSummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { CheckCircle, XCircle, RefreshCw, Send, Settings, Key, MessageCircle, Mail } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

function IntegrationCard({
  name, configured, icon: Icon, description,
}: {
  name: string;
  configured: boolean;
  icon: typeof CheckCircle;
  description: string;
}) {
  return (
    <div className={clsx(
      "bg-slate-800 border rounded-xl p-4 flex items-start gap-3",
      configured ? "border-green-500/30" : "border-red-500/30"
    )}>
      <div className={clsx("p-2 rounded-lg", configured ? "bg-green-500/20" : "bg-red-500/20")}>
        <Icon size={16} className={configured ? "text-green-400" : "text-red-400"} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{name}</span>
          {configured
            ? <CheckCircle size={12} className="text-green-400" />
            : <XCircle size={12} className="text-red-400" />
          }
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [triggerMsg, setTriggerMsg] = useState("");

  const { data: config } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
  });

  const check = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (r) => setTriggerMsg(`✓ Verificação iniciada — task: ${r.task_id}`),
  });

  const summary = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (r) => setTriggerMsg(`✓ Resumo diário iniciado — task: ${r.task_id}`),
  });

  const integrations = config?.integrations ?? {};
  const keywords = config?.priority_keywords ?? {};

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Integration status */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Settings size={14} /> Status das Integrações
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              <IntegrationCard
                name="Microsoft Outlook"
                configured={integrations.outlook_configured ?? false}
                icon={Mail}
                description={`Monitorando: ${integrations.email_address ?? "não configurado"}`}
              />
              <IntegrationCard
                name="WhatsApp"
                configured={integrations.whatsapp_configured ?? false}
                icon={MessageCircle}
                description={`Destino: ${integrations.whatsapp_to ?? "não configurado"}`}
              />
              <IntegrationCard
                name="Claude AI"
                configured={integrations.claude_configured ?? false}
                icon={Key}
                description={`Modelo: ${config?.claude_model ?? "—"}`}
              />
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
                <div className={clsx(
                  "p-2 rounded-lg",
                  health?.overall === "ok" ? "bg-green-500/20" : "bg-yellow-500/20"
                )}>
                  <Settings size={16} className={health?.overall === "ok" ? "text-green-400" : "text-yellow-400"} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">Infraestrutura</span>
                    <span className={clsx(
                      "text-xs px-1.5 py-0.5 rounded",
                      health?.overall === "ok" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                    )}>
                      {health?.overall === "ok" ? "Online" : "Degradada"}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries((health?.services ?? {}) as Record<string, { status: string }>).map(([svc, { status }]) => (
                      <div key={svc} className="flex items-center gap-1.5 text-xs text-slate-400">
                        {status === "ok"
                          ? <CheckCircle size={10} className="text-green-400" />
                          : <XCircle size={10} className="text-red-400" />
                        }
                        {svc}: {status}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Config summary */}
          {config && (
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Configuração Atual</h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 grid md:grid-cols-2 gap-3">
                {[
                  { label: "Ambiente", value: config.environment },
                  { label: "Versão", value: config.app_version },
                  { label: "Intervalo de verificação", value: `${config.check_interval_seconds}s` },
                  { label: "E-mails por lote", value: config.max_emails_per_batch },
                  { label: "Tamanho máx. de anexo", value: `${config.max_attachment_size_mb} MB` },
                  { label: "Provedor WhatsApp", value: config.whatsapp_provider },
                  { label: "Retenção de logs", value: `${config.log_retention_days} dias` },
                  { label: "Modelo IA", value: config.claude_model },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-700/50 last:border-0">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Manual triggers */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Ações Manuais</h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => check.mutate()}
                disabled={check.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <RefreshCw size={14} className={check.isPending ? "animate-spin" : ""} />
                Verificar E-mails Agora
              </button>
              <button
                onClick={() => summary.mutate()}
                disabled={summary.isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
              >
                <Send size={14} className={summary.isPending ? "animate-spin" : ""} />
                Enviar Resumo Diário
              </button>
            </div>
            {triggerMsg && (
              <p className="text-xs text-green-400 mt-2">{triggerMsg}</p>
            )}
          </section>

          {/* Keywords */}
          {Object.keys(keywords).length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Palavras-Chave de Prioridade</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: "critical", label: "CRÍTICO", color: "text-red-400 bg-red-500/10 border-red-500/20" },
                  { key: "high", label: "ALTO", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
                  { key: "medium", label: "MÉDIO", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
                ].map(({ key, label, color }) => (
                  <div key={key} className={clsx("border rounded-xl p-4", color.split(" ").slice(1).join(" "))}>
                    <p className={clsx("text-xs font-semibold mb-2", color.split(" ")[0])}>{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {((keywords[key] ?? []) as string[]).map((kw) => (
                        <span key={kw} className="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-300 rounded">
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
