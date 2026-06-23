"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Settings, CheckCircle, XCircle, Play, Calendar } from "lucide-react";
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

const fetchSettings = (): Promise<SystemSettings> =>
  api.get("/settings").then((r) => r.data);

const triggerCheck = () => api.post("/settings/trigger-check").then((r) => r.data);
const triggerSummary = () => api.post("/settings/trigger-summary").then((r) => r.data);

function IntegrationRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${ok ? "text-green-400" : "text-red-400"}`}>
        {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
        {ok ? "Configurado" : "Não configurado"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [checkMsg, setCheckMsg] = useState("");
  const [summaryMsg, setSummaryMsg] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: fetchSettings,
    refetchInterval: 60_000,
  });

  const { mutate: runCheck, isPending: checkPending } = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => {
      setCheckMsg(`Tarefa iniciada: ${data.task_id}`);
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const { mutate: runSummary, isPending: summaryPending } = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (data) => setSummaryMsg(`Tarefa iniciada: ${data.task_id}`),
  });

  if (isLoading)
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Carregando configurações...
        </div>
      </div>
    );

  const s = settings!;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Ações manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Play size={14} /> Ações Manuais
            </h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => { setCheckMsg(""); runCheck(); }}
                  disabled={checkPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Play size={13} />
                  {checkPending ? "Verificando..." : "Verificar E-mails Agora"}
                </button>
                {checkMsg && <p className="text-xs text-green-400">{checkMsg}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => { setSummaryMsg(""); runSummary(); }}
                  disabled={summaryPending}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Calendar size={13} />
                  {summaryPending ? "Enviando..." : "Enviar Resumo Diário"}
                </button>
                {summaryMsg && <p className="text-xs text-green-400">{summaryMsg}</p>}
              </div>
            </div>
          </div>

          {/* Status das integrações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={14} /> Status das Integrações
            </h3>
            <IntegrationRow
              label="Microsoft Outlook / Azure AD"
              ok={s.integrations.outlook_configured}
              detail={s.integrations.email_address}
            />
            <IntegrationRow
              label="WhatsApp"
              ok={s.integrations.whatsapp_configured}
              detail={`Provedor: ${s.whatsapp_provider} · Para: ${s.integrations.whatsapp_to}`}
            />
            <IntegrationRow
              label="Claude / Anthropic"
              ok={s.integrations.claude_configured}
              detail={`Modelo: ${s.claude_model}`}
            />
          </div>

          {/* Parâmetros do sistema */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Parâmetros do Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Versão", value: `${s.app_name} v${s.app_version}` },
                { label: "Ambiente", value: s.environment },
                { label: "Intervalo de verificação", value: `${s.check_interval_seconds}s` },
                { label: "Máx. e-mails por ciclo", value: s.max_emails_per_batch },
                { label: "Máx. tamanho de anexo", value: `${s.max_attachment_size_mb} MB` },
                { label: "Retenção de logs", value: `${s.log_retention_days} dias` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm text-white font-medium mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Palavras-chave */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Palavras-chave de Prioridade</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-red-400 mb-2">CRÍTICO</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.priority_keywords.critical.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-400 mb-2">ALTO</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.priority_keywords.high.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-yellow-400 mb-2">MÉDIO</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.priority_keywords.medium.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
