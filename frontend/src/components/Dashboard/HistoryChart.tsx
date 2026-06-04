"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { HistoryPoint } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryChartProps {
  data: HistoryPoint[];
}

export function HistoryChart({ data }: HistoryChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date + "T12:00:00"), "dd/MM", { locale: ptBR }),
  }));

  if (!data.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Sem histórico disponível</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Histórico — Últimos 7 dias</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={4}>
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#e2e8f0", marginBottom: 4 }}
            itemStyle={{ color: "#94a3b8" }}
          />
          <Legend
            formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>}
          />
          <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="critical" name="Críticos" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
