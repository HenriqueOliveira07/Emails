"use client";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { getApiKey, setApiKey } from "@/lib/api";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    setAuthed(Boolean(getApiKey()));
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener("emails:unauthorized", onUnauthorized);
    return () => window.removeEventListener("emails:unauthorized", onUnauthorized);
  }, []);

  if (authed === null) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form
        className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setApiKey(value.trim());
          setAuthed(Boolean(value.trim()));
        }}
      >
        <div className="flex items-center gap-2 text-slate-100">
          <Lock size={18} />
          <h1 className="text-lg font-semibold">Acesso ao painel</h1>
        </div>
        <p className="text-sm text-slate-400">Informe a chave de API (variável API_KEY do servidor).</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 outline-none focus:border-blue-500"
          placeholder="X-API-Key"
        />
        <button className="w-full rounded-md bg-blue-600 hover:bg-blue-500 py-2 text-white font-medium">
          Entrar
        </button>
      </form>
    </div>
  );
}
