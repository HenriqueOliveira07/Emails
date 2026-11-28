"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllNotifications, retryNotification, NotificationItem } from "@/lib/api";
import { PageShell, Card, fmtDate, Empty } from "@/components/Layout/PageShell";
import { clsx } from "clsx";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-300",
  delivered: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  pending: "bg-amber-500/15 text-amber-300",
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["all-notifications"],
    queryFn: () => fetchAllNotifications(200),
    refetchInterval: 30_000,
  });
  const retry = useMutation({
    mutationFn: retryNotification,
    onSettled: () => qc.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  return (
    <PageShell title="Notificações WhatsApp">
      <Card title="Histórico de notificações">
        {isLoading ? (
          <Empty text="Carregando…" />
        ) : !data?.length ? (
          <Empty text="Nenhuma notificação enviada ainda." />
        ) : (
          <ul className="divide-y divide-slate-700">
            {data.map((n) => {
              const st = n.status.toLowerCase();
              return (
                <li key={n.id} className="px-5 py-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className={clsx("px-2 py-0.5 rounded-full font-medium", STATUS_STYLE[st] ?? "bg-slate-600 text-slate-200")}>
                      {n.status}
                    </span>
                    <span className="text-slate-400">{n.recipient}</span>
                    <span className="text-slate-500">{fmtDate(n.sent_at ?? n.created_at)}</span>
                    {n.retry_count > 0 && <span className="text-slate-500">tentativas: {n.retry_count}</span>}
                    {st === "failed" && (
                      <button
                        onClick={() => retry.mutate(n.id)}
                        disabled={retry.isPending}
                        className="ml-auto px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                      >
                        Reenviar
                      </button>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans bg-slate-900/60 rounded-lg p-3">
                    {n.message_body}
                  </pre>
                  {n.error_message && <p className="text-xs text-red-300">Erro: {n.error_message}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
