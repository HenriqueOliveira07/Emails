"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettings, getApiKey, setApiKey } from "@/lib/api";
import { PageShell, Card, inputCls, Empty } from "@/components/Layout/PageShell";
import { CheckCircle2, XCircle } from "lucide-react";

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
      <span className="text-slate-200">{label}</span>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => setKey(getApiKey()), []);

  const { data, isError } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings, retry: false });

  function save() {
    setApiKey(key.trim());
    setSaved(true);
    qc.invalidateQueries();
  }

  return (
    <PageShell title="Configurações">
      <Card title="Acesso à API">
        <div className="p-5 flex flex-wrap gap-2 items-center">
          <input
            type="password"
            className={inputCls + " w-80 max-w-full"}
            placeholder="API_ACCESS_KEY"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false); }}
          />
          <button onClick={save} className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm">
            Salvar
          </button>
          {saved && <span className="text-xs text-emerald-400">Chave salva neste navegador</span>}
          {isError && <span className="text-xs text-red-400">Sem acesso — verifique a chave</span>}
        </div>
      </Card>

      {!data ? (
        <Card><Empty text={isError ? "Não foi possível carregar as configurações." : "Carregando…"} /></Card>
      ) : (
        <>
          <Card title="Integrações">
            <div className="p-5 grid sm:grid-cols-3 gap-3">
              <Flag ok={data.integrations.outlook_configured} label={`Outlook 365 (${data.integrations.email_address})`} />
              <Flag ok={data.integrations.whatsapp_configured} label={`WhatsApp ${data.whatsapp_provider} → ${data.integrations.whatsapp_to}`} />
              <Flag ok={data.integrations.claude_configured} label={`Claude (${data.claude_model})`} />
            </div>
          </Card>
          <Card title="Rotina">
            <dl className="p-5 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-400">Intervalo de verificação</dt><dd className="text-slate-200">{data.check_interval_seconds}s</dd>
              <dt className="text-slate-400">E-mails por lote</dt><dd className="text-slate-200">{data.max_emails_per_batch}</dd>
              <dt className="text-slate-400">Tamanho máx. de anexo</dt><dd className="text-slate-200">{data.max_attachment_size_mb} MB</dd>
              <dt className="text-slate-400">Retenção de logs</dt><dd className="text-slate-200">{data.log_retention_days} dias</dd>
              <dt className="text-slate-400">Ambiente</dt><dd className="text-slate-200">{data.environment}</dd>
            </dl>
          </Card>
          <Card title="Palavras-chave de prioridade">
            <div className="p-5 space-y-3">
              {(["critical", "high", "medium"] as const).map((lvl) => (
                <div key={lvl}>
                  <p className="text-xs uppercase text-slate-400 mb-1">{{ critical: "Crítico", high: "Alto", medium: "Médio" }[lvl]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.priority_keywords[lvl].map((k: string) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-200">{k}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </PageShell>
  );
}
