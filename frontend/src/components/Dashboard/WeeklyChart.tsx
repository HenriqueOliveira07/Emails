"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface WeeklyChartProps {
  data: Array<{ day: string; total: number; critical: number }>;
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  if (!data.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Sem dados históricos</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">E-mails — Últimos 7 Dias</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#e2e8f0" }}
            itemStyle={{ color: "#94a3b8" }}
          />
          <Legend
            formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>}
          />
          <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="critical" name="Críticos" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
