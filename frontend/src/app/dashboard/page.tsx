"use client";
import { useQuery } from "@tanstack/react-query";
import {
  fetchStats, fetchRecentEmails, fetchNotifications, fetchWeeklyStats,
  DashboardStats,
} from "@/lib/api";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { PriorityChart } from "@/components/Dashboard/PriorityChart";
import { WeeklyChart } from "@/components/Dashboard/WeeklyChart";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { NotificationLog } from "@/components/Dashboard/NotificationLog";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Mail, AlertTriangle, Paperclip, MessageCircle, XCircle, TrendingUp,
} from "lucide-react";

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

  const { data: weeklyData } = useQuery({
    queryKey: ["weekly-stats"],
    queryFn: fetchWeeklyStats,
    refetchInterval: 300_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dashboard" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="E-mails Hoje"
              value={stats?.total_emails ?? "—"}
              icon={Mail}
              color="blue"
              subtitle="processados"
            />
            <StatsCard
              title="Críticos"
              value={stats?.by_priority?.CRITICO ?? "—"}
              icon={AlertTriangle}
              color="red"
              subtitle="prioridade crítica"
            />
            <StatsCard
              title="Anexos Salvos"
              value={stats?.attachments_saved ?? "—"}
              icon={Paperclip}
              color="purple"
            />
            <StatsCard
              title="Notificações"
              value={stats?.whatsapp_sent ?? "—"}
              icon={MessageCircle}
              color="green"
              subtitle="via WhatsApp"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Alto"
              value={stats?.by_priority?.ALTO ?? "—"}
              icon={TrendingUp}
              color="orange"
            />
            <StatsCard
              title="Médio"
              value={stats?.by_priority?.MEDIO ?? "—"}
              icon={TrendingUp}
              color="yellow"
            />
            <StatsCard
              title="Spam/Ignorados"
              value={stats?.spam ?? "—"}
              icon={XCircle}
              color="blue"
            />
            <StatsCard
              title="Erros"
              value={stats?.errors ?? "—"}
              icon={XCircle}
              color="red"
            />
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-6">
            <PriorityChart data={stats?.by_priority ?? {}} />
            <div className="lg:col-span-2">
              <WeeklyChart data={weeklyData ?? []} />
            </div>
          </div>

          {/* Notifications */}
          <NotificationLog notifications={notifications ?? []} />

          {/* Email Table */}
          {loadingEmails ? (
            <div className="text-center text-slate-400 py-8">Carregando e-mails...</div>
          ) : (
            <EmailTable emails={emailsData?.items ?? []} />
          )}
        </main>
      </div>
    </div>
  );
}
