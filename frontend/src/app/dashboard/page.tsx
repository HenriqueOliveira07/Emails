"use client";
import { useQuery } from "@tanstack/react-query";
import {
  fetchStats, fetchRecentEmails, fetchNotifications, fetchHealth,
  DashboardStats,
} from "@/lib/api";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { PriorityChart } from "@/components/Dashboard/PriorityChart";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { NotificationLog } from "@/components/Dashboard/NotificationLog";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Mail, AlertTriangle, Paperclip, MessageCircle, XCircle, TrendingUp,
  CheckCircle, Database, Zap,
} from "lucide-react";
import { clsx } from "clsx";

function HealthBadge({ service, data }: { service: string; data: { status: string; error?: string } }) {
  const ok = data.status === "ok";
  return (
    <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs", ok
      ? "bg-green-500/10 border-green-500/20 text-green-400"
      : "bg-red-500/10 border-red-500/20 text-red-400"
    )}>
      {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
      <span className="capitalize">{service}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 30_000,
  });

  const { data: emailsData, isLoading: loadingEmails } = useQuery({
    queryKey: ["recent-emails"],
    queryFn: () => fetchRecentEmails(50),
    refetchInterval: 30_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(20),
    refetchInterval: 30_000,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dashboard" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Health status */}
          {health?.services && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500">Integrações:</span>
              {Object.entries(health.services as Record<string, { status: string }>).map(([svc, data]) => (
                <HealthBadge key={svc} service={svc} data={data} />
              ))}
            </div>
          )}

          {/* Primary Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="E-mails Hoje"
              value={loadingStats ? "..." : (stats?.total_emails ?? 0)}
              icon={Mail}
              color="blue"
              subtitle="processados"
            />
            <StatsCard
              title="Críticos"
              value={loadingStats ? "..." : (stats?.by_priority?.CRITICO ?? 0)}
              icon={AlertTriangle}
              color="red"
              subtitle="prioridade crítica"
            />
            <StatsCard
              title="Anexos Salvos"
              value={loadingStats ? "..." : (stats?.attachments_saved ?? 0)}
              icon={Paperclip}
              color="purple"
            />
            <StatsCard
              title="Notificações"
              value={loadingStats ? "..." : (stats?.whatsapp_sent ?? 0)}
              icon={MessageCircle}
              color="green"
              subtitle="via WhatsApp"
            />
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Alto"
              value={loadingStats ? "..." : (stats?.by_priority?.ALTO ?? 0)}
              icon={TrendingUp}
              color="orange"
            />
            <StatsCard
              title="Médio"
              value={loadingStats ? "..." : (stats?.by_priority?.MEDIO ?? 0)}
              icon={TrendingUp}
              color="yellow"
            />
            <StatsCard
              title="Spam/Ignorados"
              value={loadingStats ? "..." : (stats?.spam ?? 0)}
              icon={XCircle}
              color="blue"
            />
            <StatsCard
              title="Erros"
              value={loadingStats ? "..." : (stats?.errors ?? 0)}
              icon={Zap}
              color="red"
            />
          </div>

          {/* Chart + Notifications */}
          <div className="grid lg:grid-cols-2 gap-6">
            <PriorityChart data={stats?.by_priority ?? {}} />
            <NotificationLog notifications={notifications ?? []} />
          </div>

          {/* Email Table */}
          {loadingEmails ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
              Carregando e-mails...
            </div>
          ) : (
            <EmailTable emails={emailsData?.items ?? []} />
          )}
        </main>
      </div>
    </div>
  );
}
