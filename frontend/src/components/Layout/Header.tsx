"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchHealth, triggerCheck } from "@/lib/api";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Header({ title }: { title: string }) {
  const [triggering, setTriggering] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
  });

  const allOk = health?.overall === "ok";

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
    <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        {lastSync && (
          <span className="text-xs text-slate-400">
            Última sync: {format(lastSync, "HH:mm:ss", { locale: ptBR })}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {allOk ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-red-400" />
          )}
          <span className={`text-xs ${allOk ? "text-green-400" : "text-red-400"}`}>
            {allOk ? "Online" : "Degradado"}
          </span>
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
        >
          <RefreshCw size={12} className={triggering ? "animate-spin" : ""} />
          {triggering ? "Verificando..." : "Verificar Agora"}
        </button>
      </div>
    </header>
  );
}
