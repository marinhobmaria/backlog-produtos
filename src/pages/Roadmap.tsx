import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Calendar, ChevronLeft, ChevronRight, AlertTriangle, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { TaskDetailSheet } from "@/components/backlog/TaskDetailSheet";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachWeekOfInterval, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths, 
  isWithinInterval,
  startOfQuarter,
  endOfQuarter,
  eachMonthOfInterval,
  addQuarters,
  subQuarters,
  startOfYear,
  endOfYear,
  addYears,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "monthly" | "quarterly" | "semester" | "annual";

const statusColors: Record<TaskStatus, string> = {
  open: "bg-amber-500",
  in_progress: "bg-blue-500",
  pending: "bg-orange-500",
  resolved: "bg-emerald-500",
  closed: "bg-slate-400",
};

const priorityBorders: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  normal: "border-l-blue-500",
  low: "border-l-slate-400",
};

interface RoadmapCardProps {
  task: BacklogTask;
  onOpenDetail: () => void;
}

function RoadmapCard({ task, onOpenDetail }: RoadmapCardProps) {
  return (
    <div
      onClick={onOpenDetail}
      className={cn(
        "cursor-pointer p-2 rounded-md border-l-4 bg-card hover:bg-muted/50 transition-colors",
        priorityBorders[task.priority] || priorityBorders.normal
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
              {task.id}
            </Badge>
            <div className={cn("w-1.5 h-1.5 rounded-full", statusColors[task.status])} />
          </div>
          <p className="text-[11px] font-medium line-clamp-2 leading-tight">{task.title}</p>
          <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-0.5 truncate max-w-[80px]">
              <User className="h-2.5 w-2.5" />
              {task.assignee}
            </span>
          </div>
        </div>
        {(task.tags.includes("stale") || task.tags.includes("critical")) && (
          <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

export default function Roadmap() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<BacklogTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const selectedProduct = localStorage.getItem("selectedProduct") || "Saúde Simples";

  const { tasks, isLoading, refetch, taskContents } = useBacklogData();

  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  // Gerar períodos baseado no modo de visualização
  const periods = useMemo(() => {
    switch (viewMode) {
      case "monthly": {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        
        return eachWeekOfInterval(
          { start: monthStart, end: monthEnd },
          { weekStartsOn: 0 }
        ).map((weekStart) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
          return {
            start: weekStart,
            end: weekEnd,
            label: `${format(weekStart, "dd", { locale: ptBR })} - ${format(weekEnd, "dd", { locale: ptBR })}`,
            shortLabel: `S${Math.ceil((weekStart.getDate()) / 7)}`,
          };
        });
      }
      case "quarterly": {
        const quarterStart = startOfQuarter(currentDate);
        const quarterEnd = endOfQuarter(currentDate);
        
        return eachMonthOfInterval({ start: quarterStart, end: quarterEnd }).map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          return {
            start: monthStart,
            end: monthEnd,
            label: format(monthStart, "MMMM", { locale: ptBR }),
            shortLabel: format(monthStart, "MMM", { locale: ptBR }),
          };
        });
      }
      case "semester": {
        const year = currentDate.getFullYear();
        const isFirstSemester = currentDate.getMonth() < 6;
        const semesterStart = isFirstSemester ? new Date(year, 0, 1) : new Date(year, 6, 1);
        const semesterEnd = isFirstSemester ? new Date(year, 5, 30) : new Date(year, 11, 31);
        
        return eachMonthOfInterval({ start: semesterStart, end: semesterEnd }).map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          return {
            start: monthStart,
            end: monthEnd,
            label: format(monthStart, "MMMM", { locale: ptBR }),
            shortLabel: format(monthStart, "MMM", { locale: ptBR }),
          };
        });
      }
      case "annual": {
        const yearStart = startOfYear(currentDate);
        const yearEnd = endOfYear(currentDate);
        
        return [
          { start: new Date(currentDate.getFullYear(), 0, 1), end: new Date(currentDate.getFullYear(), 2, 31), label: "1º Trimestre", shortLabel: "Q1" },
          { start: new Date(currentDate.getFullYear(), 3, 1), end: new Date(currentDate.getFullYear(), 5, 30), label: "2º Trimestre", shortLabel: "Q2" },
          { start: new Date(currentDate.getFullYear(), 6, 1), end: new Date(currentDate.getFullYear(), 8, 30), label: "3º Trimestre", shortLabel: "Q3" },
          { start: new Date(currentDate.getFullYear(), 9, 1), end: new Date(currentDate.getFullYear(), 11, 31), label: "4º Trimestre", shortLabel: "Q4" },
        ];
      }
      default:
        return [];
    }
  }, [currentDate, viewMode]);

  // Agrupar tarefas por período
  const tasksByPeriod = useMemo(() => {
    const grouped: Record<string, BacklogTask[]> = {};
    grouped["backlog"] = [];
    
    periods.forEach((period) => {
      grouped[period.label] = [];
    });

    tasks.forEach((task) => {
      const taskDate = task.status === "closed" || task.status === "resolved"
        ? task.lastUpdatedAt
        : task.openedAt;

      let assigned = false;
      for (const period of periods) {
        if (isWithinInterval(taskDate, { start: period.start, end: period.end })) {
          grouped[period.label].push(task);
          assigned = true;
          break;
        }
      }

      if (!assigned && task.status !== "closed" && task.status !== "resolved") {
        grouped["backlog"].push(task);
      }
    });

    return grouped;
  }, [tasks, periods]);

  const handleOpenDetail = (task: BacklogTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handlePrev = () => {
    switch (viewMode) {
      case "monthly":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "quarterly":
        setCurrentDate(subQuarters(currentDate, 1));
        break;
      case "semester":
        setCurrentDate(subMonths(currentDate, 6));
        break;
      case "annual":
        setCurrentDate(subYears(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case "monthly":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "quarterly":
        setCurrentDate(addQuarters(currentDate, 1));
        break;
      case "semester":
        setCurrentDate(addMonths(currentDate, 6));
        break;
      case "annual":
        setCurrentDate(addYears(currentDate, 1));
        break;
    }
  };

  const getPeriodLabel = () => {
    switch (viewMode) {
      case "monthly":
        return format(currentDate, "MMMM yyyy", { locale: ptBR });
      case "quarterly":
        const quarter = Math.ceil((currentDate.getMonth() + 1) / 3);
        return `${quarter}º Trimestre ${currentDate.getFullYear()}`;
      case "semester":
        const isFirstSemester = currentDate.getMonth() < 6;
        return `${isFirstSemester ? "1º" : "2º"} Semestre ${currentDate.getFullYear()}`;
      case "annual":
        return currentDate.getFullYear().toString();
      default:
        return "";
    }
  };

  // Estatísticas do período
  const periodStats = useMemo(() => {
    let total = 0;
    let done = 0;
    
    Object.entries(tasksByPeriod).forEach(([key, periodTasks]) => {
      if (key !== "backlog") {
        total += periodTasks.length;
        done += periodTasks.filter(t => t.status === "closed" || t.status === "resolved").length;
      }
    });

    return { total, done, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tasksByPeriod]);

  const isCurrentPeriod = (period: { start: Date; end: Date }) => {
    return isWithinInterval(new Date(), { start: period.start, end: period.end });
  };

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Roadmap</h1>
            <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
              <Package className="h-3 w-3" />
              {selectedProduct}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Visualização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="semester">Semestral</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>

            {/* Navegação do período */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 min-w-[160px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium capitalize">
                  {getPeriodLabel()}
                </span>
              </div>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Progresso:</span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all" 
                style={{ width: `${periodStats.percentage}%` }}
              />
            </div>
            <span className="font-medium">{periodStats.percentage}%</span>
            <span className="text-muted-foreground">({periodStats.done}/{periodStats.total})</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {tasksByPeriod["backlog"]?.length || 0} no backlog
          </Badge>
        </div>

        {/* Roadmap Grid */}
        <div className="flex gap-3 h-[calc(100vh-180px)] overflow-x-auto">
          {/* Backlog Column */}
          <Card className="flex-shrink-0 w-[220px] flex flex-col h-full border-dashed">
            <CardHeader className="py-2 px-3 border-b flex-shrink-0 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Backlog</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {tasksByPeriod["backlog"]?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-1.5">
                <div className="space-y-1.5">
                  {tasksByPeriod["backlog"]?.map((task) => (
                    <RoadmapCard
                      key={task.id}
                      task={task}
                      onOpenDetail={() => handleOpenDetail(task)}
                    />
                  ))}
                  {(!tasksByPeriod["backlog"] || tasksByPeriod["backlog"].length === 0) && (
                    <div className="text-center text-muted-foreground text-xs py-8">
                      Vazio
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Period Columns */}
          {periods.map((period, index) => {
            const periodTasks = tasksByPeriod[period.label] || [];
            const isCurrent = isCurrentPeriod(period);
            
            return (
              <Card 
                key={period.label} 
                className={cn(
                  "flex-shrink-0 w-[220px] flex flex-col h-full",
                  isCurrent && "ring-2 ring-primary/50"
                )}
              >
                <CardHeader className={cn(
                  "py-2 px-3 border-b flex-shrink-0",
                  isCurrent && "bg-primary/5"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-semibold capitalize">{period.shortLabel}</CardTitle>
                      <p className="text-[10px] text-muted-foreground capitalize">{period.label}</p>
                    </div>
                    <Badge variant={isCurrent ? "default" : "secondary"} className="text-[10px]">
                      {periodTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-1.5">
                    <div className="space-y-1.5">
                      {periodTasks.map((task) => (
                        <RoadmapCard
                          key={task.id}
                          task={task}
                          onOpenDetail={() => handleOpenDetail(task)}
                        />
                      ))}
                      {periodTasks.length === 0 && (
                        <div className="text-center text-muted-foreground text-xs py-8">
                          Sem tarefas
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        content={selectedTask ? taskContents[selectedTask.id]?.content : undefined}
        history={selectedTask ? taskContents[selectedTask.id]?.history : undefined}
      />
    </AppLayout>
  );
}
