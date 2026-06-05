"use client";
import { useQuery } from "@tanstack/react-query";
import {
  fetchStats, fetchRecentEmails, fetchNotifications,
  DashboardStats,
} from "@/lib/api";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { PriorityChart } from "@/components/Dashboard/PriorityChart";
import { EmailTable } from "@/components/Dashboard/EmailTable";
import { NotificationLog } from "@/components/Dashboard/NotificationLog";
import { HistoryChart } from "@/components/Dashboard/HistoryChart";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import {
  Mail, AlertTriangle, Paperclip, MessageCircle, XCircle, TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { data: stats } = useQuery<DashboardStats>({
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dashboard" />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Stats Row 1 */}
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

          {/* Stats Row 2 */}
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

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-4">
            <PriorityChart data={stats?.by_priority ?? {}} />
            <div className="lg:col-span-2">
              <HistoryChart />
            </div>
          </div>

          {/* Notifications + Table */}
          <div className="grid lg:grid-cols-3 gap-4">
            <NotificationLog notifications={notifications ?? []} />
            <div className="lg:col-span-2">
              {loadingEmails ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
                  Carregando e-mails...
                </div>
              ) : (
                <EmailTable emails={emailsData?.items ?? []} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
