"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, Bell, Paperclip, Settings, FileText, Activity } from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/emails", label: "E-mails", icon: Mail },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/attachments", label: "Anexos", icon: Paperclip },
  { href: "/logs", label: "Logs", icon: Activity },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen shrink-0">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Mail size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">EmailMonitor</p>
            <p className="text-xs text-slate-500">Powered by Claude</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon size={15} className={active ? "text-white" : ""} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-xs text-slate-500">Sistema ativo — v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
