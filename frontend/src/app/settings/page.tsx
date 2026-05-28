"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchSettings, fetchKeywords, triggerCheck, triggerSummary } from "@/lib/api";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { Play, AlertTriangle, CheckCircle, Settings2, Tag } from "lucide-react";
import { useState } from "react";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
      ok
        ? "bg-green-500/10 border-green-500/30 text-green-400"
        : "bg-red-500/10 border-red-500/30 text-red-400"
    }`}>
      {ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
      {label}
    </div>
  );
}

function KeywordList({ title, keywords, color }: { title: string; keywords: string[]; color: string }) {
  return (
    <div className="space-y-2">
      <h4 className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <span key={kw} className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-mono">
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [triggerMsg, setTriggerMsg] = useState("");
  const [summaryMsg, setSummaryMsg] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: keywords } = useQuery({
    queryKey: ["keywords"],
    queryFn: fetchKeywords,
  });

  const checkMut = useMutation({
    mutationFn: triggerCheck,
    onSuccess: (data) => setTriggerMsg(`Tarefa enfileirada: ${data.task_id}`),
    onError: () => setTriggerMsg("Erro ao disparar verificação"),
  });

  const summaryMut = useMutation({
    mutationFn: triggerSummary,
    onSuccess: (data) => setSummaryMsg(`Tarefa enfileirada: ${data.task_id}`),
    onError: () => setSummaryMsg("Erro ao disparar resumo"),
  });

  const integrations = settings?.integrations ?? {};

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Configurações" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Info do sistema */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Informações do Sistema</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {[
                ["Aplicação", settings?.app_name],
                ["Versão", settings?.app_version],
                ["Ambiente", settings?.environment],
                ["Modelo IA", settings?.claude_model],
                ["Intervalo de verificação", `${settings?.check_interval_seconds ?? "—"}s`],
                ["Máx. e-mails/ciclo", settings?.max_emails_per_batch],
                ["Máx. tamanho anexo", `${settings?.max_attachment_size_mb ?? "—"} MB`],
                ["Retenção de logs", `${settings?.log_retention_days ?? "—"} dias`],
                ["Provedor WhatsApp", settings?.whatsapp_provider],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-slate-900/60 rounded-lg p-3">
                  <p className="text-slate-500 mb-1">{label}</p>
                  <p className="text-slate-200 font-medium truncate">{value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Status das integrações */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Status das Integrações</h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge ok={integrations.outlook_configured} label="Microsoft Outlook / Azure AD" />
              <StatusBadge ok={integrations.claude_configured} label="Claude AI (Anthropic)" />
              <StatusBadge ok={integrations.whatsapp_configured} label="WhatsApp" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-500 mb-1">E-mail monitorado</p>
                <p className="text-slate-200 font-mono">{integrations.email_address || "Não configurado"}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-500 mb-1">WhatsApp destinatário</p>
                <p className="text-slate-200 font-mono">{integrations.whatsapp_to || "Não configurado"}</p>
              </div>
            </div>
          </div>

          {/* Ações manuais */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Ações Manuais</h3>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-2">
                <button
                  onClick={() => { setTriggerMsg(""); checkMut.mutate(); }}
                  disabled={checkMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Play size={14} className={checkMut.isPending ? "animate-pulse" : ""} />
                  {checkMut.isPending ? "Disparando..." : "Verificar E-mails Agora"}
                </button>
                {triggerMsg && <p className="text-xs text-green-400 font-mono">{triggerMsg}</p>}
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { setSummaryMsg(""); summaryMut.mutate(); }}
                  disabled={summaryMut.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
                >
                  <Play size={14} className={summaryMut.isPending ? "animate-pulse" : ""} />
                  {summaryMut.isPending ? "Enviando..." : "Enviar Resumo Diário"}
                </button>
                {summaryMsg && <p className="text-xs text-green-400 font-mono">{summaryMsg}</p>}
              </div>
            </div>
          </div>

          {/* Palavras-chave */}
          {keywords && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Palavras-chave de Classificação</h3>
              </div>
              <p className="text-xs text-slate-400">
                O sistema identifica automaticamente a prioridade com base nestas palavras-chave.
                Para alterar, edite as variáveis de ambiente e reinicie o sistema.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
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
                  title="Spam / Ignorados"
                  keywords={keywords.spam ?? []}
                  color="text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Guia rápida */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Guia Rápida de Configuração</h3>
            <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside">
              <li>Copie <span className="font-mono text-slate-300">.env.example</span> para <span className="font-mono text-slate-300">.env</span> e preencha as credenciais</li>
              <li>Configure um App Registration no Azure AD com permissões <span className="font-mono text-slate-300">Mail.Read</span> e <span className="font-mono text-slate-300">Mail.ReadWrite</span></li>
              <li>Configure o WhatsApp via Twilio (sandbox) ou Meta Business API (produção)</li>
              <li>Adicione a chave da API da Anthropic (<span className="font-mono text-slate-300">ANTHROPIC_API_KEY</span>)</li>
              <li>Execute <span className="font-mono text-slate-300">docker compose up -d</span></li>
              <li>Acesse o Flower em <span className="font-mono text-slate-300">:5555</span> para monitorar as tarefas Celery</li>
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}
