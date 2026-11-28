"use client";
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-slate-700 flex flex-wrap gap-3 items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export const inputCls =
  "bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500";

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-500">{text}</p>;
}
