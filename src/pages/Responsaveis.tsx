import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  LayoutGrid,
  Layers,
  ChevronDown,
  ChevronRight,
  Users
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

type GroupByOption = "assignee" | "status" | "sector" | "client";

const groupByLabels: Record<GroupByOption, string> = {
  assignee: "Responsável",
  status: "Status",
  sector: "Setor",
  client: "Cliente",
};

export default function Responsaveis() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [groupBy, setGroupBy] = useState<GroupByOption>("assignee");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  const { 
    allTasks, 
    isLoading, 
    refetch,
  } = useBacklogData();

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const getTimeColor = (days: number) => {
    if (days > 14) return "text-red-600";
    if (days > 7) return "text-orange-600";
    if (days > 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  // Filter tasks by search
  const filteredTasks = useMemo(() => {
    if (!searchTerm) return allTasks;
    const term = searchTerm.toLowerCase();
    return allTasks.filter(t => 
      t.title.toLowerCase().includes(term) ||
      t.assignee?.toLowerCase().includes(term) ||
      t.sector?.toLowerCase().includes(term) ||
      t.client?.toLowerCase().includes(term)
    );
  }, [allTasks, searchTerm]);

  // Group tasks based on selected groupBy
  const groupedTasks = useMemo(() => {
    const groups: Record<string, BacklogTask[]> = {};
    
    filteredTasks.forEach(task => {
      let key: string;
      switch (groupBy) {
        case "assignee":
          key = task.assignee || "Não Atribuído";
          break;
        case "status":
          key = task.status;
          break;
        case "sector":
          key = task.sector || "Sem Setor";
          break;
        case "client":
          key = task.client || "Sem Cliente";
          break;
        default:
          key = "Outros";
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    // Sort groups by task count (descending)
    const sortedEntries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    
    return sortedEntries.reduce((acc, [key, tasks]) => {
      // Sort tasks within each group by days since last action
      acc[key] = tasks.sort((a, b) => (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0));
      return acc;
    }, {} as Record<string, BacklogTask[]>);
  }, [filteredTasks, groupBy]);

  const getGroupLabel = (key: string) => {
    if (groupBy === "status") {
      return statusConfig[key as TaskStatus]?.label || key;
    }
    return key;
  };

  const getGroupStats = (tasks: BacklogTask[]) => {
    const active = tasks.filter(t => t.status !== "closed" && t.status !== "resolved").length;
    const avgDays = tasks.length > 0 
      ? Math.round(tasks.reduce((sum, t) => sum + (t.daysSinceLastAction || 0), 0) / tasks.length)
      : 0;
    return { active, avgDays };
  };

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Responsáveis</h1>
            <Badge variant="secondary" className="text-xs">
              {filteredTasks.length} tarefas
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="h-8 w-48 pl-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Group By */}
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Agrupar:</span>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
                <SelectTrigger className="h-6 w-[100px] text-xs border-0 bg-transparent p-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignee">Responsável</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="sector">Setor</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "kanban")}>
              <TabsList className="h-8">
                <TabsTrigger value="table" className="h-7 px-3 text-xs gap-1.5">
                  <TableIcon className="h-3.5 w-3.5" />
                  Tabela
                </TabsTrigger>
                <TabsTrigger value="kanban" className="h-7 px-3 text-xs gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Table View with Collapsible Groups */}
        {viewMode === "table" && (
          <div className="space-y-2">
            {Object.entries(groupedTasks).map(([groupKey, tasks]) => {
              const isCollapsed = collapsedGroups.has(groupKey);
              const stats = getGroupStats(tasks);
              const statusCfg = groupBy === "status" ? statusConfig[groupKey as TaskStatus] : null;
              
              return (
                <Collapsible key={groupKey} open={!isCollapsed} onOpenChange={() => toggleGroup(groupKey)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        
                        {statusCfg && (
                          <div className={cn("w-3 h-3 rounded-full", statusCfg.color)} />
                        )}
                        
                        <span className="font-semibold text-sm">{getGroupLabel(groupKey)}</span>
                        
                        <Badge variant="secondary" className="text-xs">
                          {tasks.length}
                        </Badge>
                        
                        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            {stats.active} ativas
                          </span>
                          {stats.avgDays > 0 && (
                            <span className={cn("flex items-center gap-1", getTimeColor(stats.avgDays))}>
                              <Timer className="h-3 w-3" />
                              ~{stats.avgDays}d
                            </span>
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="w-16 text-xs">ID</TableHead>
                              <TableHead className="text-xs">Título</TableHead>
                              {groupBy !== "status" && <TableHead className="w-28 text-xs">Status</TableHead>}
                              {groupBy !== "assignee" && <TableHead className="w-36 text-xs">Responsável</TableHead>}
                              {groupBy !== "sector" && <TableHead className="w-32 text-xs">Setor</TableHead>}
                              {groupBy !== "client" && <TableHead className="w-36 text-xs">Cliente</TableHead>}
                              <TableHead className="w-28 text-xs">Aberto há</TableHead>
                              <TableHead className="w-28 text-xs">Parado há</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tasks.slice(0, 50).map((task) => (
                              <TableRow key={task.id} className="hover:bg-muted/20">
                                <TableCell className="text-xs text-muted-foreground font-mono">
                                  #{task.id.slice(0, 6)}
                                </TableCell>
                                <TableCell className="text-xs font-medium">
                                  <span className="line-clamp-1">{task.title}</span>
                                </TableCell>
                                {groupBy !== "status" && (
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px] gap-1">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig[task.status]?.color)} />
                                      {statusConfig[task.status]?.label}
                                    </Badge>
                                  </TableCell>
                                )}
                                {groupBy !== "assignee" && (
                                  <TableCell className="text-xs text-muted-foreground truncate">
                                    {task.assignee || "-"}
                                  </TableCell>
                                )}
                                {groupBy !== "sector" && (
                                  <TableCell className="text-xs text-muted-foreground truncate">
                                    {task.sector || "-"}
                                  </TableCell>
                                )}
                                {groupBy !== "client" && (
                                  <TableCell className="text-xs text-muted-foreground truncate">
                                    {task.client || "-"}
                                  </TableCell>
                                )}
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(task.openedAt), { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  <span className={cn("text-xs font-medium", getTimeColor(task.daysSinceLastAction))}>
                                    {task.daysSinceLastAction}d
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {tasks.length > 50 && (
                          <div className="p-2 text-center text-xs text-muted-foreground border-t">
                            +{tasks.length - 50} tarefas
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
            
            {Object.keys(groupedTasks).length === 0 && (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma tarefa encontrada</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="h-[calc(100vh-140px)] overflow-x-auto">
            <div className="flex gap-3 h-full min-w-max pb-3">
              {Object.entries(groupedTasks).map(([groupKey, tasks]) => {
                const statusCfg = groupBy === "status" ? statusConfig[groupKey as TaskStatus] : null;
                
                return (
                  <div key={groupKey} className="w-80 flex flex-col">
                    <div className={cn(
                      "rounded-t-lg p-3 border-b",
                      statusCfg ? "bg-muted/50" : "bg-muted/30"
                    )}>
                      <div className="flex items-center gap-2">
                        {statusCfg && (
                          <div className={cn("w-3 h-3 rounded-full", statusCfg.color)} />
                        )}
                        <span className="font-semibold text-sm truncate">
                          {getGroupLabel(groupKey)}
                        </span>
                        <Badge variant="secondary" className="text-xs ml-auto">{tasks.length}</Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 rounded-b-lg bg-muted/20 border-x border-b">
                      <div className="p-2 space-y-2">
                        {tasks.slice(0, 50).map((task) => (
                          <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-3">
                              <p className="font-medium text-xs mb-2 line-clamp-2">{task.title}</p>
                              
                              {groupBy !== "assignee" && task.assignee && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
                                  <User className="h-3 w-3" />
                                  <span className="truncate">{task.assignee}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(task.openedAt), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </span>
                                {task.daysSinceLastAction > 7 && (
                                  <Badge variant="destructive" className="text-[9px] h-4">
                                    {task.daysSinceLastAction}d
                                  </Badge>
                                )}
                              </div>
                              
                              {groupBy !== "status" && (
                                <Badge variant="outline" className="text-[9px] mt-2 gap-1">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig[task.status]?.color)} />
                                  {statusConfig[task.status]?.label}
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        {tasks.length > 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            +{tasks.length - 50} tarefas
                          </p>
                        )}
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
        )}
      </div>
    </AppLayout>
  );
}