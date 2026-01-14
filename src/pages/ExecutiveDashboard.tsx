import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Badge } from "@/components/ui/badge";
import {
  ListTodo,
  Clock,
  AlertTriangle,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Pause,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@/types";

const statusConfig: Record<TaskStatus, { label: string; icon: typeof ListTodo; color: string }> = {
  open: { label: "Aberto", icon: ListTodo, color: "text-blue-600 bg-blue-50" },
  in_progress: { label: "Em Andamento", icon: Loader2, color: "text-amber-600 bg-amber-50" },
  pending: { label: "Pendente", icon: Pause, color: "text-orange-600 bg-orange-50" },
  resolved: { label: "Resolvido", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
  closed: { label: "Fechado", icon: XCircle, color: "text-gray-600 bg-gray-50" },
};

export default function ExecutiveDashboard() {
  const { metrics, agingBuckets, isLoading, refetch } = useBacklogData();

  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  const criticalAgingTotal = agingBuckets
    .filter((b) => b.isCritical)
    .reduce((acc, b) => acc + b.count, 0);

  return (
    <AppLayout onRefresh={refetch} isRefreshing={isLoading}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Visão consolidada dos indicadores de performance
          </p>
        </div>

        {/* Main Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Tarefas</p>
                <p className="text-3xl font-bold mt-1">{metrics.total}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Without Action */}
          <div className="rounded-xl border border-warning/20 bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sem Ação (&gt;7 dias)</p>
                <p className="text-3xl font-bold mt-1 text-warning">{metrics.tasksWithoutAction}</p>
              </div>
              <div className="rounded-lg bg-warning/10 p-2.5">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </div>

          {/* Critical Aging */}
          <div className="rounded-xl border border-destructive/20 bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fora do SLA</p>
                <p className="text-3xl font-bold mt-1 text-destructive">{criticalAgingTotal}</p>
                <p className="text-xs text-muted-foreground mt-0.5">&gt;8 dias sem ação</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-2.5">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </div>

          {/* Active (not closed) */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tarefas Ativas</p>
                <p className="text-3xl font-bold mt-1">
                  {metrics.total - metrics.byStatus.closed - metrics.byStatus.resolved}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Excluindo fechadas/resolvidas</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Loader2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Resumo por Status</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            {(Object.keys(statusConfig) as TaskStatus[]).map((status) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              return (
                <div
                  key={status}
                  className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
                >
                  <div className={cn("rounded-lg p-2", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.byStatus[status]}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Oldest and Newest */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {/* Oldest Task */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Tarefa Mais Antiga</h3>
            </div>
            {metrics.oldestTask ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {metrics.oldestTask.id}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(metrics.oldestTask.openedAt, "dd/MM/yyyy")}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{metrics.oldestTask.title}</p>
                <p className="text-xs text-destructive font-medium">
                  {metrics.oldestTask.daysSinceLastAction} dias sem ação
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
            )}
          </div>

          {/* Newest Task */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Tarefa Mais Recente</h3>
            </div>
            {metrics.newestTask ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {metrics.newestTask.id}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(metrics.newestTask.openedAt, "dd/MM/yyyy")}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{metrics.newestTask.title}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
            )}
          </div>
        </div>

        {/* Aging Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Aging do Backlog</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {agingBuckets.map((bucket) => (
              <div
                key={bucket.label}
                className={cn(
                  "rounded-lg border p-4 text-center",
                  bucket.isCritical
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border"
                )}
              >
                <p className={cn(
                  "text-2xl font-bold",
                  bucket.isCritical && "text-destructive"
                )}>
                  {bucket.count}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{bucket.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Glossary */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Glossário</h3>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <p><strong>Sem Ação:</strong> Tarefas sem atualização há mais de 7 dias</p>
            <p><strong>Fora do SLA:</strong> Tarefas sem ação há mais de 8 dias (faixas críticas)</p>
            <p><strong>Tarefas Ativas:</strong> Total excluindo status "Fechado" e "Resolvido"</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
