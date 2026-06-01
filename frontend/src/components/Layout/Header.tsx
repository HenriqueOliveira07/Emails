"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchHealth, triggerCheck } from "@/lib/api";
import { RefreshCw, Wifi, WifiOff, Database, Server } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServiceDot {
  name: string;
  ok: boolean;
}

export function Header({ title }: { title: string }) {
  const [triggering, setTriggering] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const allOk = health?.overall === "ok";
  const services: ServiceDot[] = Object.entries(health?.services ?? {}).map(
    ([name, svc]: [string, any]) => ({ name, ok: svc.status === "ok" })
  );

  async function handleTrigger() {
    setTriggering(true);
    try {
      await triggerCheck();
      setLastSync(new Date());
    } finally {
      setTriggering(false);
    }
  }

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Service dots */}
        {services.length > 0 && (
          <div className="hidden lg:flex items-center gap-2">
            {services.map((svc) => (
              <div key={svc.name} className="flex items-center gap-1" title={svc.name}>
                <div className={`w-1.5 h-1.5 rounded-full ${svc.ok ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-xs text-slate-500 capitalize">{svc.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Overall status */}
        <div className="flex items-center gap-1.5">
          {allOk ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-red-400" />
          )}
          <span className={`text-xs font-medium ${allOk ? "text-green-400" : "text-red-400"}`}>
            {allOk ? "Online" : "Degradado"}
          </span>
        </div>

        {/* Last sync */}
        {lastSync && (
          <span className="text-xs text-slate-500 hidden md:block">
            Sync: {format(lastSync, "HH:mm:ss", { locale: ptBR })}
          </span>
        )}

        {/* Trigger button */}
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg text-xs text-white transition-colors font-medium"
        >
          <RefreshCw size={12} className={triggering ? "animate-spin" : ""} />
          {triggering ? "Verificando..." : "Verificar Agora"}
        </button>
      </div>
    </header>
  );
}
