import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  CheckCircle2,
  Circle,
  Loader2,
  Timer,
  User,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<TaskStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: typeof Circle;
  description: string;
}> = {
  open: { 
    label: "Aberto", 
    color: "bg-blue-500", 
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    icon: Circle,
    description: "Aguardando início"
  },
  in_progress: { 
    label: "Em Andamento", 
    color: "bg-amber-500", 
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    icon: Loader2,
    description: "Em execução"
  },
  pending: { 
    label: "Pendente", 
    color: "bg-orange-500", 
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    icon: Clock,
    description: "Aguardando resposta"
  },
  resolved: { 
    label: "Resolvido", 
    color: "bg-green-500", 
    bgColor: "bg-green-50 dark:bg-green-950/30",
    icon: CheckCircle2,
    description: "Solução aplicada"
  },
  closed: { 
    label: "Fechado", 
    color: "bg-gray-400", 
    bgColor: "bg-gray-50 dark:bg-gray-950/30",
    icon: CheckCircle2,
    description: "Finalizado"
  },
};

export default function Status() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { allTasks, isLoading, refetch } = useBacklogData();

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, BacklogTask[]> = {
      open: [],
      in_progress: [],
      pending: [],
      resolved: [],
      closed: [],
    };
    
    allTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by days since last action (oldest first for active, newest first for closed)
    Object.keys(grouped).forEach((status) => {
      if (status === "closed" || status === "resolved") {
        grouped[status as TaskStatus].sort((a, b) => 
          new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
        );
      } else {
        grouped[status as TaskStatus].sort((a, b) => 
          (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0)
        );
      }
    });

    return grouped;
  }, [allTasks]);

  const getTimeColor = (days: number) => {
    if (days > 14) return "text-red-600 bg-red-50 dark:bg-red-950/30";
    if (days > 7) return "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
    if (days > 3) return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
    return "text-muted-foreground bg-muted";
  };

  const totalTasks = allTasks.length;

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full h-[calc(100vh-44px)] overflow-x-auto p-3">
        {/* Stats Header */}
        <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2">
          {(["open", "in_progress", "pending", "resolved", "closed"] as TaskStatus[]).map((status) => {
            const config = statusConfig[status];
            const count = tasksByStatus[status].length;
            const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
            
            return (
              <Card key={status} className={cn("shrink-0", config.bgColor)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", config.color)} />
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {percentage}%
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kanban Board */}
        <div className="flex gap-3 h-[calc(100%-80px)] min-w-max">
          {(["open", "in_progress", "pending", "resolved", "closed"] as TaskStatus[]).map((status) => {
            const config = statusConfig[status];
            const tasks = tasksByStatus[status];
            
            return (
              <div key={status} className="w-80 flex flex-col">
                <div className={cn("rounded-t-lg p-3 border-b", config.bgColor)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", config.color)} />
                    <span className="font-semibold text-sm">{config.label}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">{tasks.length}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{config.description}</p>
                </div>
                
                <ScrollArea className="flex-1 rounded-b-lg bg-muted/30 border-x border-b">
                  <div className="p-2 space-y-2">
                    {tasks.map((task) => (
                      <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-3">
                          <p className="font-medium text-xs mb-2 line-clamp-2">{task.title}</p>
                          
                          {/* Assignee */}
                          {task.assignee && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
                              <User className="h-3 w-3" />
                              <span className="truncate">{task.assignee}</span>
                            </div>
                          )}
                          
                          {/* Time info */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(task.openedAt), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                            {task.daysSinceLastAction > 0 && status !== "closed" && status !== "resolved" && (
                              <Badge 
                                variant="outline" 
                                className={cn("text-[9px] h-4", getTimeColor(task.daysSinceLastAction))}
                              >
                                <Timer className="h-2.5 w-2.5 mr-0.5" />
                                {task.daysSinceLastAction}d
                              </Badge>
                            )}
                          </div>
                          
                          {/* Sector & Client */}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {task.sector && (
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {task.sector}
                              </span>
                            )}
                          </div>
                          
                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {task.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[9px] h-4">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {tasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Nenhuma tarefa
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
