import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  User, 
  Search, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Timer,
  TableIcon,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: typeof Circle }> = {
  open: { label: "Aberto", color: "bg-blue-500", icon: Circle },
  in_progress: { label: "Em Andamento", color: "bg-amber-500", icon: Loader2 },
  pending: { label: "Pendente", color: "bg-orange-500", icon: Clock },
  resolved: { label: "Resolvido", color: "bg-green-500", icon: CheckCircle2 },
  closed: { label: "Fechado", color: "bg-gray-400", icon: CheckCircle2 },
};

interface AssigneeGroup {
  name: string;
  tasks: BacklogTask[];
  activeCount: number;
  avgDaysOpen: number;
}

export default function Responsaveis() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  
  const { allTasks, isLoading, refetch } = useBacklogData();

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  const assigneeGroups = useMemo(() => {
    const groups = new Map<string, AssigneeGroup>();
    
    allTasks.forEach((task) => {
      const assignee = task.assignee || "Não Atribuído";
      if (!groups.has(assignee)) {
        groups.set(assignee, {
          name: assignee,
          tasks: [],
          activeCount: 0,
          avgDaysOpen: 0,
        });
      }
      const group = groups.get(assignee)!;
      group.tasks.push(task);
      if (task.status !== "closed" && task.status !== "resolved") {
        group.activeCount++;
      }
    });

    // Calculate average days open for active tasks
    groups.forEach((group) => {
      const activeTasks = group.tasks.filter(t => t.status !== "closed" && t.status !== "resolved");
      if (activeTasks.length > 0) {
        const totalDays = activeTasks.reduce((sum, t) => sum + (t.daysSinceLastAction || 0), 0);
        group.avgDaysOpen = Math.round(totalDays / activeTasks.length);
      }
    });

    return Array.from(groups.values())
      .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.activeCount - a.activeCount);
  }, [allTasks, searchTerm]);

  const selectedGroup = selectedAssignee 
    ? assigneeGroups.find(g => g.name === selectedAssignee)
    : null;

  const getTimeColor = (days: number) => {
    if (days > 14) return "text-red-600";
    if (days > 7) return "text-orange-600";
    if (days > 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full h-[calc(100vh-44px)] flex">
        {/* Left Panel - Assignee List */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Responsáveis</h2>
              <Badge variant="secondary" className="text-xs">{assigneeGroups.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar responsável..." 
                className="h-8 pl-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {assigneeGroups.map((group) => (
                <button
                  key={group.name}
                  onClick={() => setSelectedAssignee(group.name)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    selectedAssignee === group.name 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted border border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm truncate flex-1" title={group.name}>
                      {group.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                      {group.tasks.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      {group.activeCount} ativas
                    </span>
                    {group.avgDaysOpen > 0 && (
                      <span className={cn("flex items-center gap-1", getTimeColor(group.avgDaysOpen))}>
                        <Timer className="h-3 w-3" />
                        ~{group.avgDaysOpen}d
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Tasks Board */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedGroup ? (
            <>
              <div className="p-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedGroup.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedGroup.tasks.length} tarefas • {selectedGroup.activeCount} ativas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {Object.entries(statusConfig).map(([status, config]) => {
                        const count = selectedGroup.tasks.filter(t => t.status === status).length;
                        if (count === 0) return null;
                        return (
                          <Badge key={status} variant="outline" className="text-xs gap-1">
                            <div className={cn("w-2 h-2 rounded-full", config.color)} />
                            {count}
                          </Badge>
                        );
                      })}
                    </div>
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "kanban")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="table" className="h-7 px-2 text-xs gap-1">
                          <TableIcon className="h-3.5 w-3.5" />
                          Tabela
                        </TabsTrigger>
                        <TabsTrigger value="kanban" className="h-7 px-2 text-xs gap-1">
                          <LayoutGrid className="h-3.5 w-3.5" />
                          Kanban
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </div>
              
              {/* Content based on view mode */}
              {viewMode === "table" ? (
                <div className="flex-1 overflow-auto p-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[120px]">Setor</TableHead>
                        <TableHead className="w-[120px]">Cliente</TableHead>
                        <TableHead className="w-[100px]">Aberto há</TableHead>
                        <TableHead className="w-[100px]">Parado há</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedGroup.tasks
                        .sort((a, b) => (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0))
                        .map((task) => {
                          const config = statusConfig[task.status];
                          return (
                            <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-mono text-xs">{task.id}</TableCell>
                              <TableCell>
                                <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs gap-1">
                                  <div className={cn("w-2 h-2 rounded-full", config.color)} />
                                  {config.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {task.sector || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {task.client || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(task.openedAt), { 
                                  locale: ptBR 
                                })}
                              </TableCell>
                              <TableCell>
                                {task.status !== "closed" && task.status !== "resolved" ? (
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-[10px]", getTimeColor(task.daysSinceLastAction || 0))}
                                  >
                                    {task.daysSinceLastAction || 0}d
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Kanban view */
                <div className="flex-1 overflow-x-auto p-3">
                  <div className="flex gap-3 h-full min-w-max">
                    {(["open", "in_progress", "pending", "resolved", "closed"] as TaskStatus[]).map((status) => {
                      const config = statusConfig[status];
                      const tasks = selectedGroup.tasks.filter(t => t.status === status);
                      
                      return (
                        <div key={status} className="w-72 flex flex-col">
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <div className={cn("w-2.5 h-2.5 rounded-full", config.color)} />
                            <span className="font-medium text-sm">{config.label}</span>
                            <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>
                          </div>
                          
                          <ScrollArea className="flex-1 rounded-lg bg-muted/30 p-2">
                            <div className="space-y-2">
                              {tasks.map((task) => (
                                <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
                                  <CardContent className="p-3">
                                    <p className="font-medium text-xs mb-2 line-clamp-2">{task.title}</p>
                                    
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(task.openedAt), { 
                                          addSuffix: true, 
                                          locale: ptBR 
                                        })}
                                      </span>
                                      {task.daysSinceLastAction > 7 && (
                                        <Badge variant="destructive" className="text-[9px] h-4">
                                          {task.daysSinceLastAction}d parado
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {task.client && (
                                      <p className="text-[10px] text-muted-foreground mt-2 truncate">
                                        {task.client}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                                      {task.tags?.slice(0, 2).map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-[9px] h-4">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                              {tasks.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-4">
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
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecione um responsável</p>
                <p className="text-xs mt-1">para ver suas tarefas</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
