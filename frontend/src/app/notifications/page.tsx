"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchNotificationsList } from "@/lib/api";
import { NotificationLog } from "@/components/Dashboard/NotificationLog";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";

export default function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications-full"],
    queryFn: () => fetchNotificationsList(100),
    refetchInterval: 30_000,
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Notificações" />
        <main className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-slate-400 py-8">Carregando notificações...</div>
          ) : (
            <NotificationLog notifications={data ?? []} />
          )}
        </main>
      </div>
    </div>
  );
}
