"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface DayStats {
  date: string;
  label: string;
  total: number;
  critical: number;
  high: number;
  notifications: number;
}

const fetchHistory = (): Promise<DayStats[]> =>
  api.get("/dashboard/stats/history?days=7").then((r) => r.data);

export function HistoryChart() {
  const { data = [] } = useQuery({
    queryKey: ["stats-history"],
    queryFn: fetchHistory,
    refetchInterval: 60_000,
  });

  if (data.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Sem histórico disponível</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Histórico — Últimos 7 Dias</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#e2e8f0" }}
            itemStyle={{ color: "#94a3b8" }}
          />
          <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
          <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="critical" name="Críticos" fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="notifications" name="WhatsApp" fill="#22c55e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
