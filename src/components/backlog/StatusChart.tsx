import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TaskStatus } from "@/types";

interface StatusChartProps {
  data: Record<TaskStatus, number>;
  onStatusClick: (status: TaskStatus) => void;
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  open: { label: "Aberto", color: "#3b82f6" },
  in_progress: { label: "Em Andamento", color: "#f59e0b" },
  pending: { label: "Pendente", color: "#f97316" },
  resolved: { label: "Resolvido", color: "#22c55e" },
  closed: { label: "Fechado", color: "#6b7280" },
};

export function StatusChart({ data, onStatusClick }: StatusChartProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: status as TaskStatus,
    name: statusConfig[status as TaskStatus].label,
    count,
    color: statusConfig[status as TaskStatus].color,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">Quantidade por Status</h3>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis
              dataKey="name"
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
              formatter={(value: number) => [value, "Tarefas"]}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(data) => onStatusClick(data.status)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Clique em uma barra para filtrar
      </p>
    </div>
  );
}
