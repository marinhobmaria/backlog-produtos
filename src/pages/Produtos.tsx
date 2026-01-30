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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Table2, LayoutGrid, Layers, Clock, CheckCircle2, Circle, Loader2 } from "lucide-react";
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

export default function Produtos() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState<"table" | "kanban" | "summary">("table");
  const [groupBy, setGroupBy] = useState<GroupByOption>("status");
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

  // Group tasks for kanban view
  const groupedTasks = useMemo(() => {
    const tasksToGroup = allTasks;
    
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
    
    // Sort groups by count
    const sorted = Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
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
            {/* Group By (only for kanban) */}
            {activeView === "kanban" && (
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
                  <SelectTrigger className="h-7 w-[120px] text-xs">
                    <SelectValue placeholder="Agrupar por" />
                  </SelectTrigger>
                  <SelectContent>
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

            {/* Table */}
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
              {Object.entries(groupedTasks).map(([key, tasks]) => {
                const config = statusConfig[key as TaskStatus];
                const isStatusGroup = groupBy === "status";
                
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
                          {isStatusGroup && config ? config.label : key}
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
                              
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                                <span className="truncate">{task.assignee}</span>
                              </div>
                              
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

        {activeView === "summary" && (
          <SummaryDashboard tasks={allTasks} />
        )}
      </div>
    </AppLayout>
  );
}
