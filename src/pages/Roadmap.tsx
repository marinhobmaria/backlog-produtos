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
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const selectedProduct = localStorage.getItem("selectedProduct") || "Saúde Simples";

  const { tasks, isLoading, refetch, taskContents } = useBacklogData();

  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  // Gerar semanas do mês atual
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 0 }
    ).map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      return {
        start: weekStart,
        end: weekEnd,
        label: `${format(weekStart, "dd", { locale: ptBR })} - ${format(weekEnd, "dd", { locale: ptBR })}`,
      };
    });
  }, [currentMonth]);

  // Agrupar tarefas por semana (usando lastUpdatedAt como referência)
  const tasksByWeek = useMemo(() => {
    const grouped: Record<string, BacklogTask[]> = {};
    
    // Também criar categoria "Backlog" para tarefas sem período definido
    grouped["backlog"] = [];
    
    weeks.forEach((week) => {
      grouped[week.label] = [];
    });

    tasks.forEach((task) => {
      // Tarefas fechadas/resolvidas ficam na semana correspondente
      // Tarefas abertas vão para o backlog ou semana atual
      const taskDate = task.status === "closed" || task.status === "resolved"
        ? task.lastUpdatedAt
        : task.openedAt;

      let assigned = false;
      for (const week of weeks) {
        if (isWithinInterval(taskDate, { start: week.start, end: week.end })) {
          grouped[week.label].push(task);
          assigned = true;
          break;
        }
      }

      // Se não foi atribuído a nenhuma semana do mês, vai para backlog
      if (!assigned && task.status !== "closed" && task.status !== "resolved") {
        grouped["backlog"].push(task);
      }
    });

    return grouped;
  }, [tasks, weeks]);

  const handleOpenDetail = (task: BacklogTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Estatísticas do mês
  const monthStats = useMemo(() => {
    let total = 0;
    let done = 0;
    
    Object.entries(tasksByWeek).forEach(([key, weekTasks]) => {
      if (key !== "backlog") {
        total += weekTasks.length;
        done += weekTasks.filter(t => t.status === "closed" || t.status === "resolved").length;
      }
    });

    return { total, done, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tasksByWeek]);

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Roadmap</h1>
            <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
              <Package className="h-3 w-3" />
              {selectedProduct}
            </Badge>
          </div>

          {/* Navegação do mês */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 min-w-[140px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Progresso:</span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all" 
                style={{ width: `${monthStats.percentage}%` }}
              />
            </div>
            <span className="font-medium">{monthStats.percentage}%</span>
            <span className="text-muted-foreground">({monthStats.done}/{monthStats.total})</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {tasksByWeek["backlog"]?.length || 0} no backlog
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
                  {tasksByWeek["backlog"]?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-1.5">
                <div className="space-y-1.5">
                  {tasksByWeek["backlog"]?.map((task) => (
                    <RoadmapCard
                      key={task.id}
                      task={task}
                      onOpenDetail={() => handleOpenDetail(task)}
                    />
                  ))}
                  {(!tasksByWeek["backlog"] || tasksByWeek["backlog"].length === 0) && (
                    <div className="text-center text-muted-foreground text-xs py-8">
                      Vazio
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Week Columns */}
          {weeks.map((week, index) => {
            const weekTasks = tasksByWeek[week.label] || [];
            const isCurrentWeek = isWithinInterval(new Date(), { start: week.start, end: week.end });
            
            return (
              <Card 
                key={week.label} 
                className={cn(
                  "flex-shrink-0 w-[220px] flex flex-col h-full",
                  isCurrentWeek && "ring-2 ring-primary/50"
                )}
              >
                <CardHeader className={cn(
                  "py-2 px-3 border-b flex-shrink-0",
                  isCurrentWeek && "bg-primary/5"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-semibold">Semana {index + 1}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{week.label}</p>
                    </div>
                    <Badge variant={isCurrentWeek ? "default" : "secondary"} className="text-[10px]">
                      {weekTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-1.5">
                    <div className="space-y-1.5">
                      {weekTasks.map((task) => (
                        <RoadmapCard
                          key={task.id}
                          task={task}
                          onOpenDetail={() => handleOpenDetail(task)}
                        />
                      ))}
                      {weekTasks.length === 0 && (
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
