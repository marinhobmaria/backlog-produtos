import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Clock, 
  CheckCircle2,
  Circle,
  Loader2,
  TableIcon,
  LayoutGrid,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Timer,
  User,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    bgColor: "bg-blue-500/10",
    icon: Circle,
    description: "Aguardando início"
  },
  in_progress: { 
    label: "Em Andamento", 
    color: "bg-amber-500", 
    bgColor: "bg-amber-500/10",
    icon: Loader2,
    description: "Em execução"
  },
  pending: { 
    label: "Pendente", 
    color: "bg-orange-500", 
    bgColor: "bg-orange-500/10",
    icon: Clock,
    description: "Aguardando resposta"
  },
  resolved: { 
    label: "Resolvido", 
    color: "bg-green-500", 
    bgColor: "bg-green-500/10",
    icon: CheckCircle2,
    description: "Solução aplicada"
  },
  closed: { 
    label: "Fechado", 
    color: "bg-gray-400", 
    bgColor: "bg-gray-400/10",
    icon: CheckCircle2,
    description: "Finalizado"
  },
};

type GroupByOption = "status" | "assignee" | "sector" | "client";

export default function Status() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [groupBy, setGroupBy] = useState<GroupByOption>("status");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);

  const { allTasks, isLoading, refetch } = useBacklogData();

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const assignees = new Set<string>();
    const sectors = new Set<string>();
    
    allTasks.forEach(task => {
      if (task.assignee) assignees.add(task.assignee);
      if (task.sector) sectors.add(task.sector);
    });
    
    return {
      assignees: Array.from(assignees).sort(),
      sectors: Array.from(sectors).sort(),
    };
  }, [allTasks]);

  // Count active filters
  const activeFilterCount = statusFilter.length + assigneeFilter.length + sectorFilter.length;

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          task.title.toLowerCase().includes(term) ||
          task.assignee?.toLowerCase().includes(term) ||
          task.sector?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(task.status)) return false;
      
      // Assignee filter
      if (assigneeFilter.length > 0 && !assigneeFilter.includes(task.assignee || "")) return false;
      
      // Sector filter
      if (sectorFilter.length > 0 && !sectorFilter.includes(task.sector || "")) return false;
      
      return true;
    });
  }, [allTasks, searchTerm, statusFilter, assigneeFilter, sectorFilter]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, BacklogTask[]> = {};
    
    filteredTasks.forEach(task => {
      let key: string;
      switch (groupBy) {
        case "status":
          key = task.status;
          break;
        case "assignee":
          key = task.assignee || "Não Atribuído";
          break;
        case "sector":
          key = task.sector || "Sem Setor";
          break;
        case "client":
          key = task.client || "Sem Cliente";
          break;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    // Define status order for grouping
    const statusOrder: TaskStatus[] = ["open", "in_progress", "pending", "resolved", "closed"];
    
    // Sort groups
    let sortedEntries = Object.entries(groups);
    if (groupBy === "status") {
      sortedEntries = sortedEntries.sort((a, b) => 
        statusOrder.indexOf(a[0] as TaskStatus) - statusOrder.indexOf(b[0] as TaskStatus)
      );
    } else {
      sortedEntries = sortedEntries.sort((a, b) => b[1].length - a[1].length);
    }

    return sortedEntries.map(([key, tasks]) => {
      const sortedTasks = tasks.sort((a, b) => (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0));
      const stagnantCount = sortedTasks.filter(t => t.daysSinceLastAction > 7).length;
      const avgDaysIdle = sortedTasks.length > 0 
        ? Math.round(sortedTasks.reduce((sum, t) => sum + (t.daysSinceLastAction || 0), 0) / sortedTasks.length)
        : 0;
      
      return {
        key,
        label: groupBy === "status" ? (statusConfig[key as TaskStatus]?.label || key) : key,
        tasks: sortedTasks,
        statusColor: groupBy === "status" ? statusConfig[key as TaskStatus]?.color : undefined,
        bgColor: groupBy === "status" ? statusConfig[key as TaskStatus]?.bgColor : undefined,
        description: groupBy === "status" ? statusConfig[key as TaskStatus]?.description : undefined,
        stagnantCount,
        avgDaysIdle,
      };
    });
  }, [filteredTasks, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupedTasks.map(g => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setAssigneeFilter([]);
    setSectorFilter([]);
    setSearchTerm("");
  };

  const getTimeColor = (days: number) => {
    if (days > 14) return "text-destructive";
    if (days > 7) return "text-orange-600";
    if (days > 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  const totalTasks = allTasks.length;

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Stats Header */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {(["open", "in_progress", "pending", "resolved", "closed"] as TaskStatus[]).map((status) => {
            const config = statusConfig[status];
            const count = allTasks.filter(t => t.status === status).length;
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

        {/* Header with filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Status</h1>
            <Badge variant="secondary" className="text-xs">
              {filteredTasks.length} tarefas
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  Status
                  {statusFilter.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">{statusFilter.length}</Badge>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-xs">Filtrar por status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={statusFilter.includes(key as TaskStatus)}
                    onCheckedChange={(checked) => {
                      setStatusFilter(prev => 
                        checked 
                          ? [...prev, key as TaskStatus]
                          : prev.filter(s => s !== key)
                      );
                    }}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", config.color)} />
                      {config.label}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assignee Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  Responsável
                  {assigneeFilter.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">{assigneeFilter.length}</Badge>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-auto">
                <DropdownMenuLabel className="text-xs">Filtrar por responsável</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filterOptions.assignees.map((assignee) => (
                  <DropdownMenuCheckboxItem
                    key={assignee}
                    checked={assigneeFilter.includes(assignee)}
                    onCheckedChange={(checked) => {
                      setAssigneeFilter(prev => 
                        checked ? [...prev, assignee] : prev.filter(a => a !== assignee)
                      );
                    }}
                    className="text-xs"
                  >
                    {assignee}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sector Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  Setor
                  {sectorFilter.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">{sectorFilter.length}</Badge>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-auto">
                <DropdownMenuLabel className="text-xs">Filtrar por setor</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filterOptions.sectors.map((sector) => (
                  <DropdownMenuCheckboxItem
                    key={sector}
                    checked={sectorFilter.includes(sector)}
                    onCheckedChange={(checked) => {
                      setSectorFilter(prev => 
                        checked ? [...prev, sector] : prev.filter(s => s !== sector)
                      );
                    }}
                    className="text-xs"
                  >
                    {sector}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                <X className="h-3 w-3" />
                Limpar ({activeFilterCount})
              </Button>
            )}

            <div className="h-6 w-px bg-border mx-1" />

            {/* Group By */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Agrupar:</span>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="assignee">Responsável</SelectItem>
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
                  Lista
                </TabsTrigger>
                <TabsTrigger value="kanban" className="h-7 px-3 text-xs gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Board
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* List View - Collapsible Cards */}
        {viewMode === "table" && (
          <div className="space-y-3">
            {/* Expand/Collapse All */}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
                Expandir todos
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
                Recolher todos
              </Button>
            </div>

            {groupedTasks.map((group) => {
              const isExpanded = expandedGroups.has(group.key);
              
              return (
                <Collapsible
                  key={group.key}
                  open={isExpanded}
                  onOpenChange={() => toggleGroup(group.key)}
                >
                  <Card className={cn(
                    "transition-all",
                    isExpanded && "ring-1 ring-primary/20"
                  )}>
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          {/* Expand/Collapse Icon */}
                          <div className="shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Status Icon or User Icon */}
                          {group.statusColor ? (
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", group.bgColor)}>
                              <div className={cn("w-3 h-3 rounded-full", group.statusColor)} />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          
                          {/* Name and Stats */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">{group.label}</span>
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {group.tasks.length} tarefas
                              </Badge>
                              {group.description && (
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  — {group.description}
                                </span>
                              )}
                            </div>
                            
                            {/* Mini stats when collapsed */}
                            {!isExpanded && (
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                {group.stagnantCount > 0 && (
                                  <span className="flex items-center gap-1 text-orange-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    {group.stagnantCount} paradas &gt;7d
                                  </span>
                                )}
                                {group.avgDaysIdle > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    Média {group.avgDaysIdle}d sem ação
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-16 text-xs">ID</TableHead>
                              <TableHead className="text-xs">Título</TableHead>
                              <TableHead className="w-24 text-xs">Status</TableHead>
                              <TableHead className="w-32 text-xs">Responsável</TableHead>
                              <TableHead className="w-32 text-xs">Setor</TableHead>
                              <TableHead className="w-32 text-xs">Cliente</TableHead>
                              <TableHead className="w-24 text-xs text-right">Aberto há</TableHead>
                              <TableHead className="w-20 text-xs text-right">Parado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.tasks.map((task) => {
                              const status = statusConfig[task.status];
                              return (
                                <TableRow 
                                  key={task.id} 
                                  className="cursor-pointer hover:bg-muted/50"
                                >
                                  <TableCell className="text-xs font-mono text-muted-foreground">
                                    {task.id}
                                  </TableCell>
                                  <TableCell className="text-xs font-medium max-w-md truncate">
                                    {task.title}
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={cn("text-[10px]", status?.bgColor)}
                                    >
                                      <div className={cn("w-1.5 h-1.5 rounded-full mr-1", status?.color)} />
                                      {status?.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground truncate">
                                    {task.assignee || "—"}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground truncate">
                                    {task.sector || "—"}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground truncate">
                                    {task.client || "—"}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground text-right">
                                    {formatDistanceToNow(new Date(task.openedAt), { 
                                      addSuffix: false, 
                                      locale: ptBR 
                                    })}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {task.daysSinceLastAction > 0 && task.status !== "closed" && task.status !== "resolved" ? (
                                      <span className={cn("text-xs font-medium", getTimeColor(task.daysSinceLastAction))}>
                                        {task.daysSinceLastAction}d
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}

            {groupedTasks.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma tarefa encontrada
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="flex gap-3 h-[calc(100vh-220px)] overflow-x-auto pb-4">
            {(["open", "in_progress", "pending", "resolved", "closed"] as TaskStatus[]).map((status) => {
              const config = statusConfig[status];
              const tasks = filteredTasks.filter(t => t.status === status).sort(
                (a, b) => (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0)
              );
              
              return (
                <div key={status} className="w-80 flex flex-col shrink-0">
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
                                  className={cn("text-[9px] h-4", 
                                    task.daysSinceLastAction > 14 ? "text-destructive bg-destructive/10" :
                                    task.daysSinceLastAction > 7 ? "text-orange-600 bg-orange-50" :
                                    "text-muted-foreground"
                                  )}
                                >
                                  <Timer className="h-2.5 w-2.5 mr-0.5" />
                                  {task.daysSinceLastAction}d
                                </Badge>
                              )}
                            </div>
                            
                            {/* Sector */}
                            {task.sector && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{task.sector}</span>
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
        )}
      </div>
    </AppLayout>
  );
}
