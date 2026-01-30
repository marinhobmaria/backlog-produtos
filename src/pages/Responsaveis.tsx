import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search, 
  Clock, 
  CheckCircle2,
  Circle,
  Loader2,
  TableIcon,
  LayoutGrid,
  Filter,
  X,
  ChevronDown,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: "Aberto", color: "bg-blue-500", bgColor: "bg-blue-500/10" },
  in_progress: { label: "Em Andamento", color: "bg-amber-500", bgColor: "bg-amber-500/10" },
  pending: { label: "Pendente", color: "bg-orange-500", bgColor: "bg-orange-500/10" },
  resolved: { label: "Resolvido", color: "bg-green-500", bgColor: "bg-green-500/10" },
  closed: { label: "Fechado", color: "bg-gray-400", bgColor: "bg-gray-400/10" },
};

type GroupByOption = "assignee" | "status" | "sector" | "client";

export default function Responsaveis() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [groupBy, setGroupBy] = useState<GroupByOption>("assignee");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  
  const { 
    allTasks, 
    isLoading, 
    refetch,
  } = useBacklogData();

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const assignees = new Set<string>();
    const sectors = new Set<string>();
    const clients = new Set<string>();
    
    allTasks.forEach(task => {
      if (task.assignee) assignees.add(task.assignee);
      if (task.sector) sectors.add(task.sector);
      if (task.client) clients.add(task.client);
    });
    
    return {
      assignees: Array.from(assignees).sort(),
      sectors: Array.from(sectors).sort(),
      clients: Array.from(clients).sort(),
    };
  }, [allTasks]);

  // Count active filters
  const activeFilterCount = statusFilter.length + assigneeFilter.length + sectorFilter.length + clientFilter.length;

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          task.title.toLowerCase().includes(term) ||
          task.assignee?.toLowerCase().includes(term) ||
          task.sector?.toLowerCase().includes(term) ||
          task.client?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(task.status)) return false;
      
      // Assignee filter
      if (assigneeFilter.length > 0 && !assigneeFilter.includes(task.assignee || "")) return false;
      
      // Sector filter
      if (sectorFilter.length > 0 && !sectorFilter.includes(task.sector || "")) return false;
      
      // Client filter
      if (clientFilter.length > 0 && !clientFilter.includes(task.client || "")) return false;
      
      return true;
    });
  }, [allTasks, searchTerm, statusFilter, assigneeFilter, sectorFilter, clientFilter]);

  // Group tasks
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
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    // Sort groups by count, sort tasks by days idle
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([key, tasks]) => ({
        key,
        label: groupBy === "status" ? (statusConfig[key as TaskStatus]?.label || key) : key,
        tasks: tasks.sort((a, b) => (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0)),
        statusColor: groupBy === "status" ? statusConfig[key as TaskStatus]?.color : undefined,
        bgColor: groupBy === "status" ? statusConfig[key as TaskStatus]?.bgColor : undefined,
      }));
  }, [filteredTasks, groupBy]);

  const clearFilters = () => {
    setStatusFilter([]);
    setAssigneeFilter([]);
    setSectorFilter([]);
    setClientFilter([]);
    setSearchTerm("");
  };

  const getTimeColor = (days: number) => {
    if (days > 14) return "text-destructive";
    if (days > 7) return "text-orange-600";
    if (days > 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header with filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Responsáveis</h1>
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

        {/* List View - ClickUp style with inline group headers */}
        {viewMode === "table" && (
          <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
            {groupedTasks.map((group, groupIndex) => (
              <div key={group.key}>
                {/* Group Header - Inline style like ClickUp */}
                <div className={cn(
                  "flex items-center gap-3 px-4 py-2.5 border-b",
                  group.bgColor || "bg-muted/40",
                  groupIndex > 0 && "border-t-2"
                )}>
                  {group.statusColor && (
                    <div className={cn("w-3 h-3 rounded-full", group.statusColor)} />
                  )}
                  {!group.statusColor && groupBy === "assignee" && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <span className="font-semibold text-sm">{group.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {group.tasks.length}
                  </Badge>
                </div>
                
                {/* Tasks */}
                {group.tasks.map((task, taskIndex) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer border-b last:border-b-0",
                      "group"
                    )}
                  >
                    {/* Status indicator */}
                    {groupBy !== "status" && (
                      <div className={cn("w-2 h-2 rounded-full shrink-0", statusConfig[task.status]?.color)} />
                    )}
                    
                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.title}</p>
                    </div>
                    
                    {/* Assignee (if not grouped by assignee) */}
                    {groupBy !== "assignee" && task.assignee && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-32 shrink-0">
                        <User className="h-3 w-3" />
                        <span className="truncate">{task.assignee}</span>
                      </div>
                    )}
                    
                    {/* Status badge (if not grouped by status) */}
                    {groupBy !== "status" && (
                      <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                        <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig[task.status]?.color)} />
                        {statusConfig[task.status]?.label}
                      </Badge>
                    )}
                    
                    {/* Sector */}
                    {groupBy !== "sector" && task.sector && (
                      <span className="text-xs text-muted-foreground w-24 truncate shrink-0">
                        {task.sector}
                      </span>
                    )}
                    
                    {/* Time info */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground w-24">
                        {formatDistanceToNow(new Date(task.openedAt), { locale: ptBR })}
                      </span>
                      <span className={cn("text-xs font-medium w-12 text-right", getTimeColor(task.daysSinceLastAction))}>
                        {task.daysSinceLastAction}d
                      </span>
                    </div>
                  </div>
                ))}
                
                {group.tasks.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhuma tarefa
                  </div>
                )}
              </div>
            ))}
            
            {groupedTasks.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma tarefa encontrada</p>
                {activeFilterCount > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="h-[calc(100vh-140px)] overflow-x-auto">
            <div className="flex gap-3 h-full min-w-max pb-3">
              {groupedTasks.map((group) => (
                <div key={group.key} className="w-80 flex flex-col">
                  <div className={cn(
                    "rounded-t-lg p-3 border-b",
                    group.bgColor || "bg-muted/50"
                  )}>
                    <div className="flex items-center gap-2">
                      {group.statusColor && (
                        <div className={cn("w-3 h-3 rounded-full", group.statusColor)} />
                      )}
                      {!group.statusColor && groupBy === "assignee" && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <span className="font-semibold text-sm truncate">{group.label}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">{group.tasks.length}</Badge>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1 rounded-b-lg bg-muted/20 border-x border-b">
                    <div className="p-2 space-y-2">
                      {group.tasks.map((task) => (
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
                      {group.tasks.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          Nenhuma tarefa
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ))}
              
              {groupedTasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma tarefa encontrada</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}