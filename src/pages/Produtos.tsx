import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { BacklogFiltersComponent } from "@/components/backlog/BacklogFilters";
import { BacklogTable } from "@/components/backlog/BacklogTable";
import { OperationalAlerts } from "@/components/backlog/OperationalAlerts";
import { StatusChart } from "@/components/backlog/StatusChart";
import { AgingChart } from "@/components/backlog/AgingChart";
import { TimelineChart } from "@/components/backlog/TimelineChart";
import { SummaryDashboard } from "@/components/backlog/SummaryDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, 
  Table2, 
  LayoutGrid, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Timer,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type GroupByOption = "none" | "status" | "sector" | "client" | "assignee";

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  open: { label: "Aberto", color: "bg-blue-500" },
  in_progress: { label: "Em Andamento", color: "bg-amber-500" },
  pending: { label: "Pendente", color: "bg-orange-500" },
  resolved: { label: "Resolvido", color: "bg-green-500" },
  closed: { label: "Fechado", color: "bg-gray-400" },
};

const groupByLabels: Record<GroupByOption, string> = {
  none: "Sem agrupamento",
  status: "Status",
  sector: "Setor",
  client: "Cliente",
  assignee: "Responsável",
};

export default function Produtos() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState<"table" | "kanban" | "summary">("table");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const selectedProduct = "Saúde Simples";
  
  const {
    tasks,
    totalTasks,
    statusCounts,
    agingBuckets,
    dailyOpenings,
    alerts,
    filterOptions,
    currentPage,
    totalPages,
    pageSize,
    sortColumn,
    sortDirection,
    handleSort,
    setCurrentPage,
    setPageSize,
    filters,
    updateFilter,
    resetFilters,
    filterByStatus,
    toggleAlertsOnly,
    hasActiveFilters,
    activeFilterCount,
    savedFilters,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter,
    exportToXLS,
    isLoading,
    refetch,
    taskContents,
    allTasks,
  } = useBacklogData();

  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

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

  const getGroupStats = (tasks: BacklogTask[]) => {
    const active = tasks.filter(t => t.status !== "closed" && t.status !== "resolved").length;
    const avgDays = tasks.length > 0 
      ? Math.round(tasks.reduce((sum, t) => sum + (t.daysSinceLastAction || 0), 0) / tasks.length)
      : 0;
    return { active, avgDays };
  };

  const getGroupLabel = (key: string) => {
    if (groupBy === "status") {
      return statusConfig[key as TaskStatus]?.label || key;
    }
    return key;
  };

  // Group tasks for kanban/grouped table view
  const groupedTasks = useMemo(() => {
    const tasksToGroup = allTasks;
    
    if (groupBy === "none") {
      return { "Todas as Tarefas": tasksToGroup };
    }
    
    if (groupBy === "status") {
      return {
        open: tasksToGroup.filter(t => t.status === "open"),
        in_progress: tasksToGroup.filter(t => t.status === "in_progress"),
        pending: tasksToGroup.filter(t => t.status === "pending"),
        resolved: tasksToGroup.filter(t => t.status === "resolved"),
        closed: tasksToGroup.filter(t => t.status === "closed"),
      };
    }
    
    const grouped: Record<string, BacklogTask[]> = {};
    tasksToGroup.forEach(task => {
      const key = groupBy === "sector" ? (task.sector || "Sem Setor") 
                : groupBy === "client" ? (task.client || "Sem Cliente")
                : groupBy === "assignee" ? (task.assignee || "Não Atribuído")
                : task.status;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    
    // Sort groups by count and sort tasks within by days since last action
    const sorted = Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length)
      .reduce((acc, [key, value]) => {
        acc[key] = value.sort((a, b) => (b.daysSinceLastAction || 0) - (a.daysSinceLastAction || 0));
        return acc;
      }, {} as Record<string, BacklogTask[]>);
    
    return sorted;
  }, [allTasks, groupBy]);

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Backlog</h1>
            <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
              <Package className="h-3 w-3" />
              {selectedProduct}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Group By - Available for table and kanban */}
            {(activeView === "table" || activeView === "kanban") && (
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Agrupar:</span>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
                  <SelectTrigger className="h-6 w-[110px] text-xs border-0 bg-transparent p-0 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="sector">Setor</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="assignee">Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "table" | "kanban" | "summary")}>
              <TabsList className="h-8">
                <TabsTrigger value="table" className="h-7 px-3 text-xs gap-1.5">
                  <Table2 className="h-3.5 w-3.5" />
                  Tabela
                </TabsTrigger>
                <TabsTrigger value="kanban" className="h-7 px-3 text-xs gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="summary" className="h-7 px-3 text-xs gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Resumo
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {activeView === "table" && (
          <>
            {/* Filters */}
            <BacklogFiltersComponent
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              filterOptions={filterOptions}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
              savedFilters={savedFilters}
              saveCurrentFilter={saveCurrentFilter}
              loadSavedFilter={loadSavedFilter}
              deleteSavedFilter={deleteSavedFilter}
            />

            {/* Table - Grouped or Regular */}
            {groupBy === "none" ? (
              <BacklogTable
                tasks={tasks}
                totalTasks={totalTasks}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onExport={exportToXLS}
                taskContents={taskContents}
              />
            ) : (
              <div className="space-y-2">
                {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => {
                  const isCollapsed = collapsedGroups.has(groupKey);
                  const stats = getGroupStats(groupTasks);
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
                              {groupTasks.length}
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
                                {groupTasks.slice(0, 50).map((task) => (
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
                            {groupTasks.length > 50 && (
                              <div className="p-2 text-center text-xs text-muted-foreground border-t">
                                +{groupTasks.length - 50} tarefas
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            {/* Indicadores */}
            <OperationalAlerts
              alerts={alerts}
              alertsOnly={filters.alertsOnly}
              onToggleAlertsOnly={toggleAlertsOnly}
              totalTasks={totalTasks}
              openTasks={tasks.filter(t => t.status !== 'closed' && t.status !== 'resolved').length}
            />

            {/* Charts Row */}
            <div className="grid gap-3 md:grid-cols-3">
              <StatusChart data={statusCounts} onStatusClick={filterByStatus} />
              <AgingChart data={agingBuckets} />
              <TimelineChart data={dailyOpenings} />
            </div>
          </>
        )}

        {activeView === "kanban" && (
          <div className="h-[calc(100vh-140px)] overflow-x-auto">
            <div className="flex gap-3 h-full min-w-max pb-3">
              {Object.entries(groupedTasks).map(([key, columnTasks]) => {
                const config = statusConfig[key as TaskStatus];
                const isStatusGroup = groupBy === "status" || groupBy === "none";
                
                return (
                  <div key={key} className="w-80 flex flex-col">
                    <div className={cn(
                      "rounded-t-lg p-3 border-b",
                      isStatusGroup && config ? "bg-muted/50" : "bg-muted/30"
                    )}>
                      <div className="flex items-center gap-2">
                        {isStatusGroup && config && (
                          <div className={cn("w-3 h-3 rounded-full", config.color)} />
                        )}
                        <span className="font-semibold text-sm truncate">
                          {getGroupLabel(key)}
                        </span>
                        <Badge variant="secondary" className="text-xs ml-auto">{columnTasks.length}</Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 rounded-b-lg bg-muted/20 border-x border-b">
                      <div className="p-2 space-y-2">
                        {columnTasks.slice(0, 50).map((task) => (
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
                              
                              {!isStatusGroup && (
                                <Badge variant="outline" className="text-[9px] mt-2 gap-1">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig[task.status]?.color)} />
                                  {statusConfig[task.status]?.label}
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        {columnTasks.length > 50 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            +{columnTasks.length - 50} tarefas
                          </p>
                        )}
                        {columnTasks.length === 0 && (
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

        {activeView === "summary" && (
          <SummaryDashboard tasks={allTasks} />
        )}
      </div>
    </AppLayout>
  );
}
