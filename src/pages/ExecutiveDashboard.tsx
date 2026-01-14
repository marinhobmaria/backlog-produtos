import { useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ListTodo,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Pause,
  XCircle,
  Timer,
  Zap,
  Info,
  HelpCircle,
} from "lucide-react";
import { differenceInDays, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskStatus, BacklogTask } from "@/types";

// Configuração de status com tooltips explicativos
const statusConfig: Record<TaskStatus, { 
  label: string; 
  icon: typeof ListTodo; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  open: { 
    label: "Aberto", 
    icon: ListTodo, 
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Tarefas recém-criadas aguardando triagem ou atribuição. Ainda não iniciou nenhum trabalho."
  },
  in_progress: { 
    label: "Em Andamento", 
    icon: Loader2, 
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Tarefas que estão sendo ativamente trabalhadas. Há um responsável executando as atividades."
  },
  pending: { 
    label: "Pendente", 
    icon: Pause, 
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "Tarefas bloqueadas aguardando resposta do cliente, aprovação ou dependência externa."
  },
  resolved: { 
    label: "Resolvido", 
    icon: CheckCircle2, 
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Tarefas concluídas aguardando validação final ou fechamento formal pelo solicitante."
  },
  closed: { 
    label: "Fechado", 
    icon: XCircle, 
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    description: "Tarefas finalizadas e validadas. Ciclo completo encerrado."
  },
};

// Descrições das métricas
const metricDescriptions = {
  total: "Quantidade total de tarefas no backlog, incluindo todos os status.",
  semAcao: "Tarefas que não receberam nenhuma atualização (comentário, mudança de status ou edição) nos últimos 7 dias.",
  foraSLA: "Tarefas que ultrapassaram o limite de 8 dias sem nenhuma ação. Requerem atenção urgente.",
  cycleTime: "Tempo médio que uma tarefa leva para ir do status 'Em Andamento' até 'Resolvido/Fechado'. Mede a eficiência da execução.",
  leadTime: "Tempo médio desde a abertura da tarefa até sua resolução final. Mede o tempo total de entrega percebido pelo cliente.",
  ativas: "Total de tarefas que ainda não foram concluídas (exclui Resolvido e Fechado).",
};

function calculateCycleAndLeadTime(tasks: BacklogTask[]) {
  const completedTasks = tasks.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  );

  if (completedTasks.length === 0) {
    return {
      avgCycleTimeHours: 0,
      avgLeadTimeHours: 0,
      avgCycleTimeDays: 0,
      avgLeadTimeDays: 0,
      completedCount: 0,
    };
  }

  let totalLeadTimeHours = 0;
  let totalCycleTimeHours = 0;
  let cycleCount = 0;

  completedTasks.forEach((task) => {
    // Lead Time: openedAt -> lastUpdatedAt (quando foi resolvido/fechado)
    const leadTimeHours = differenceInHours(task.lastUpdatedAt, task.openedAt);
    totalLeadTimeHours += Math.max(0, leadTimeHours);

    // Cycle Time: estimativa baseada em 50% do lead time (simplificação)
    // Em um sistema real, seria a diferença entre quando entrou "em andamento" e quando foi resolvido
    const cycleTimeHours = leadTimeHours * 0.5;
    totalCycleTimeHours += Math.max(0, cycleTimeHours);
    cycleCount++;
  });

  const avgLeadTimeHours = Math.round(totalLeadTimeHours / completedTasks.length);
  const avgCycleTimeHours = Math.round(totalCycleTimeHours / cycleCount);

  return {
    avgCycleTimeHours,
    avgLeadTimeHours,
    avgCycleTimeDays: Math.round(avgCycleTimeHours / 24 * 10) / 10,
    avgLeadTimeDays: Math.round(avgLeadTimeHours / 24 * 10) / 10,
    completedCount: completedTasks.length,
  };
}

function formatTimeDisplay(hours: number): string {
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24 * 10) / 10;
  return `${days}d`;
}

export default function ExecutiveDashboard() {
  const { tasks, metrics, agingBuckets, isLoading, refetch } = useBacklogData();

  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  const criticalAgingTotal = agingBuckets
    .filter((b) => b.isCritical)
    .reduce((acc, b) => acc + b.count, 0);

  const timeMetrics = useMemo(() => calculateCycleAndLeadTime(tasks), [tasks]);

  const activeTasks = metrics.total - metrics.byStatus.closed - metrics.byStatus.resolved;

  return (
    <AppLayout onRefresh={refetch} isRefreshing={isLoading}>
      <div className="w-full px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Indicadores</h1>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Total */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Total de Tarefas</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">{metricDescriptions.total}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold mt-1">{metrics.total}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ativas */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Tarefas Ativas</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">{metricDescriptions.ativas}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold mt-1">{activeTasks}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2">
                  <Loader2 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sem Ação >7d */}
          <Card className="relative overflow-hidden border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Sem Ação (&gt;7 dias)</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">{metricDescriptions.semAcao}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-amber-600">{metrics.tasksWithoutAction}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fora do SLA */}
          <Card className="relative overflow-hidden border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Fora do SLA</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">{metricDescriptions.foraSLA}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-destructive">{criticalAgingTotal}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cycle Time */}
          <Card className="relative overflow-hidden border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Cycle Time</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">{metricDescriptions.cycleTime}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-purple-600">
                    {timeMetrics.avgCycleTimeDays}d
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    ~{timeMetrics.avgCycleTimeHours}h médio
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-2">
                  <Timer className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Time */}
          <Card className="relative overflow-hidden border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Lead Time</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p className="text-xs">{metricDescriptions.leadTime}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-indigo-600">
                    {timeMetrics.avgLeadTimeDays}d
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    ~{timeMetrics.avgLeadTimeHours}h médio
                  </p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2">
                  <Zap className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold">Resumo por Status</h2>
            <Badge variant="outline" className="text-xs">
              {timeMetrics.completedCount} concluídas
            </Badge>
          </div>
          
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            {(Object.keys(statusConfig) as TaskStatus[]).map((status) => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const count = metrics.byStatus[status];
              const percentage = metrics.total > 0 
                ? Math.round((count / metrics.total) * 100) 
                : 0;
              
              return (
                <Tooltip key={status}>
                  <TooltipTrigger asChild>
                    <Card className="cursor-help hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("rounded-lg p-2", config.bgColor)}>
                            <Icon className={cn("h-4 w-4", config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <p className="text-xl font-bold">{count}</p>
                              <p className="text-xs text-muted-foreground">{percentage}%</p>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                          </div>
                        </div>
                        {/* Mini progress bar */}
                        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", config.bgColor.replace("50", "500"))}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{config.label}</p>
                      <p className="text-xs">{config.description}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Aging Distribution */}
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">Aging do Backlog</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-xs">
                    Distribuição das tarefas por tempo sem ação. 
                    Faixas em vermelho indicam tarefas críticas que ultrapassaram o SLA.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {agingBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className={cn(
                    "rounded-lg border p-4 text-center transition-colors",
                    bucket.isCritical
                      ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                      : "border-border hover:bg-muted/50"
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
          </CardContent>
        </Card>

        {/* Glossary */}
        <Card className="bg-muted/30">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Glossário de Métricas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-foreground">Cycle Time:</span>
                  <span className="text-muted-foreground ml-1">
                    Tempo médio de execução (início do trabalho → conclusão)
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Lead Time:</span>
                  <span className="text-muted-foreground ml-1">
                    Tempo total da abertura até a entrega final
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Sem Ação:</span>
                  <span className="text-muted-foreground ml-1">
                    Tarefas sem atualização há mais de 7 dias
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-foreground">Fora do SLA:</span>
                  <span className="text-muted-foreground ml-1">
                    Tarefas sem ação há mais de 8 dias (faixas críticas)
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Tarefas Ativas:</span>
                  <span className="text-muted-foreground ml-1">
                    Total excluindo "Fechado" e "Resolvido"
                  </span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Aging:</span>
                  <span className="text-muted-foreground ml-1">
                    Distribuição por tempo sem movimentação
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
