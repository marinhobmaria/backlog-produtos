import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DailySync } from "@/types";

interface SyncChartProps {
  data: DailySync[];
}

export function SyncChart({ data }: SyncChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Sincronizações - Últimos 7 dias
      </h3>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(220, 8%, 46%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(220, 13%, 91%)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(220, 8%, 46%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(220, 13%, 91%)" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              labelStyle={{ color: "hsl(220, 14%, 10%)" }}
            />
            <Area
              type="monotone"
              dataKey="success"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              fill="url(#successGradient)"
              name="Sucesso"
            />
            <Area
              type="monotone"
              dataKey="error"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2}
              fill="url(#errorGradient)"
              name="Erro"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
