import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, 
  Target, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Play,
  Pause,
  LayoutGrid,
  List,
  User,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { formatDistanceToNow, differenceInDays, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: "Novo", color: "bg-blue-500", bgColor: "bg-blue-500/10" },
  in_progress: { label: "Em Andamento", color: "bg-amber-500", bgColor: "bg-amber-500/10" },
  pending: { label: "Impedido", color: "bg-red-500", bgColor: "bg-red-500/10" },
  resolved: { label: "Concluído", color: "bg-green-500", bgColor: "bg-green-500/10" },
  closed: { label: "Fechado", color: "bg-gray-400", bgColor: "bg-gray-400/10" },
};

// Azure DevOps style columns
const sprintColumns = [
  { id: "new", label: "Novo", status: "open" as TaskStatus, color: "bg-blue-500" },
  { id: "active", label: "Ativo", status: "in_progress" as TaskStatus, color: "bg-amber-500" },
  { id: "blocked", label: "Impedido", status: "pending" as TaskStatus, color: "bg-red-500" },
  { id: "done", label: "Concluído", status: "resolved" as TaskStatus, color: "bg-green-500" },
];

// Mock sprints (in real scenario, this would come from Azure DevOps API)
const mockSprints = [
  { id: "sprint-1", name: "Sprint 1", startDate: new Date("2024-01-01"), endDate: new Date("2024-01-14") },
  { id: "sprint-2", name: "Sprint 2", startDate: new Date("2024-01-15"), endDate: new Date("2024-01-28") },
  { id: "sprint-3", name: "Sprint 3 (Atual)", startDate: new Date(), endDate: addDays(new Date(), 14), isCurrent: true },
];

export default function Sprint() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSprint, setSelectedSprint] = useState(mockSprints[2].id);
  const [viewMode, setViewMode] = useState<"board" | "backlog" | "capacity">("board");
  
  const { 
    allTasks, 
    isLoading, 
    refetch,
  } = useBacklogData();

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  const currentSprint = mockSprints.find(s => s.id === selectedSprint) || mockSprints[2];
  const daysRemaining = differenceInDays(currentSprint.endDate, new Date());
  const totalDays = differenceInDays(currentSprint.endDate, currentSprint.startDate);
  const progressPercent = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

  // Group tasks by status for the board
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, BacklogTask[]> = {
      open: [],
      in_progress: [],
      pending: [],
      resolved: [],
      closed: [],
    };
    
    allTasks.forEach(task => {
      if (task.status !== "closed") {
        grouped[task.status].push(task);
      }
    });
    
    return grouped;
  }, [allTasks]);

  // Calculate sprint metrics
  const sprintMetrics = useMemo(() => {
    const activeTasks = allTasks.filter(t => t.status !== "closed");
    const completedTasks = activeTasks.filter(t => t.status === "resolved");
    const blockedTasks = activeTasks.filter(t => t.status === "pending");
    const inProgressTasks = activeTasks.filter(t => t.status === "in_progress");
    
    return {
      total: activeTasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      blocked: blockedTasks.length,
      completionRate: activeTasks.length > 0 
        ? Math.round((completedTasks.length / activeTasks.length) * 100) 
        : 0,
    };
  }, [allTasks]);

  // Group tasks by assignee for capacity view
  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string, { tasks: BacklogTask[]; completed: number; total: number }> = {};
    
    allTasks.filter(t => t.status !== "closed").forEach(task => {
      const assignee = task.assignee || "Não Atribuído";
      if (!grouped[assignee]) {
        grouped[assignee] = { tasks: [], completed: 0, total: 0 };
      }
      grouped[assignee].tasks.push(task);
      grouped[assignee].total++;
      if (task.status === "resolved") {
        grouped[assignee].completed++;
      }
    });
    
    return Object.entries(grouped)
      .sort((a, b) => b[1].total - a[1].total);
  }, [allTasks]);

  const getTimeColor = (days: number) => {
    if (days > 14) return "text-destructive";
    if (days > 7) return "text-orange-600";
    if (days > 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Sprint</h1>
            <Select value={selectedSprint} onValueChange={setSelectedSprint}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockSprints.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      {sprint.isCurrent && <Badge variant="secondary" className="text-[9px] h-4">Atual</Badge>}
                      {sprint.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "board" | "backlog" | "capacity")}>
              <TabsList className="h-8">
                <TabsTrigger value="board" className="h-7 px-3 text-xs gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Board
                </TabsTrigger>
                <TabsTrigger value="backlog" className="h-7 px-3 text-xs gap-1.5">
                  <List className="h-3.5 w-3.5" />
                  Backlog
                </TabsTrigger>
                <TabsTrigger value="capacity" className="h-7 px-3 text-xs gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Capacidade
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Sprint Info Bar */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Sprint Progress */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Progresso da Sprint</span>
                  <span className="text-xs font-medium">
                    {format(currentSprint.startDate, "dd/MM")} - {format(currentSprint.endDate, "dd/MM")}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Sprint encerrada"}
                  </span>
                  <span className="text-[10px] font-medium">{Math.round(progressPercent)}%</span>
                </div>
              </div>

              <div className="h-8 w-px bg-border" />

              {/* Metrics */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{sprintMetrics.total}</div>
                  <div className="text-[10px] text-muted-foreground">Itens</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{sprintMetrics.completed}</div>
                  <div className="text-[10px] text-muted-foreground">Concluídos</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-600">{sprintMetrics.inProgress}</div>
                  <div className="text-[10px] text-muted-foreground">Em Progresso</div>
                </div>
                {sprintMetrics.blocked > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{sprintMetrics.blocked}</div>
                    <div className="text-[10px] text-muted-foreground">Impedidos</div>
                  </div>
                )}
              </div>

              <div className="h-8 w-px bg-border" />

              {/* Completion Rate */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-primary/20">
                  <span className="text-sm font-bold">{sprintMetrics.completionRate}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Taxa de<br/>Conclusão</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Board View - Azure DevOps Style */}
        {viewMode === "board" && (
          <div className="h-[calc(100vh-220px)] overflow-x-auto">
            <div className="flex gap-3 h-full min-w-max pb-3">
              {sprintColumns.map((column) => {
                const tasks = tasksByStatus[column.status];
                
                return (
                  <div key={column.id} className="w-72 flex flex-col">
                    {/* Column Header */}
                    <div className="rounded-t-lg p-3 bg-muted/50 border-b flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-sm", column.color)} />
                      <span className="font-semibold text-sm">{column.label}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">{tasks.length}</Badge>
                    </div>
                    
                    {/* Column Content */}
                    <ScrollArea className="flex-1 rounded-b-lg bg-muted/10 border-x border-b">
                      <div className="p-2 space-y-2">
                        {tasks.map((task) => (
                          <Card 
                            key={task.id} 
                            className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                          >
                            <CardContent className="p-3">
                              {/* Task ID */}
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-[9px] font-mono">
                                  #{task.id.slice(0, 6)}
                                </Badge>
                                {task.daysSinceLastAction > 7 && (
                                  <Badge variant="destructive" className="text-[9px] h-4 gap-0.5">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {task.daysSinceLastAction}d
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Title */}
                              <p className="font-medium text-xs mb-2 line-clamp-2">{task.title}</p>
                              
                              {/* Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                {task.assignee ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                      <User className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                      {task.assignee}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Não atribuído</span>
                                )}
                                <span className={cn("text-[10px]", getTimeColor(task.daysSinceLastAction))}>
                                  {task.daysSinceLastAction}d
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {tasks.length === 0 && (
                          <div className="py-8 text-center text-xs text-muted-foreground">
                            Nenhum item
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Backlog View */}
        {viewMode === "backlog" && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-20 text-xs">ID</TableHead>
                  <TableHead className="text-xs">Título</TableHead>
                  <TableHead className="w-28 text-xs">Estado</TableHead>
                  <TableHead className="w-40 text-xs">Atribuído a</TableHead>
                  <TableHead className="w-28 text-xs">Setor</TableHead>
                  <TableHead className="w-24 text-xs text-right">Idade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTasks
                  .filter(t => t.status !== "closed")
                  .sort((a, b) => {
                    // Sort by status priority: in_progress > pending > open > resolved
                    const priority: Record<TaskStatus, number> = {
                      in_progress: 0,
                      pending: 1,
                      open: 2,
                      resolved: 3,
                      closed: 4,
                    };
                    return priority[a.status] - priority[b.status];
                  })
                  .map((task) => (
                    <TableRow 
                      key={task.id} 
                      className="hover:bg-muted/20 cursor-pointer"
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        #{task.id.slice(0, 6)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-sm shrink-0", statusConfig[task.status]?.color)} />
                          <span className="line-clamp-1">{task.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          {statusConfig[task.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {task.assignee && (
                            <>
                              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-2.5 w-2.5 text-primary" />
                              </div>
                              <span className="truncate">{task.assignee}</span>
                            </>
                          )}
                          {!task.assignee && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate">
                        {task.sector || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-xs font-medium", getTimeColor(task.daysSinceLastAction))}>
                          {task.daysSinceLastAction}d
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Capacity View */}
        {viewMode === "capacity" && (
          <div className="space-y-3">
            {tasksByAssignee.map(([assignee, data]) => {
              const completionRate = data.total > 0 
                ? Math.round((data.completed / data.total) * 100) 
                : 0;
              
              return (
                <Card key={assignee}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      
                      {/* Name and Progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm truncate">{assignee}</span>
                          <span className="text-xs text-muted-foreground">
                            {data.completed}/{data.total} concluídos
                          </span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <div className="text-sm font-bold">{data.total}</div>
                          <div className="text-[9px] text-muted-foreground">Atribuídos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-600">{data.completed}</div>
                          <div className="text-[9px] text-muted-foreground">Concluídos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold">{completionRate}%</div>
                          <div className="text-[9px] text-muted-foreground">Taxa</div>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {/* Task breakdown by status */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      {Object.entries(statusConfig).map(([status, config]) => {
                        const count = data.tasks.filter(t => t.status === status).length;
                        if (count === 0 || status === "closed") return null;
                        return (
                          <Badge key={status} variant="outline" className="text-[10px] gap-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
                            {count} {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
