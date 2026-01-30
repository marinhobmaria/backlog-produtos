import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { BacklogFiltersComponent } from "@/components/backlog/BacklogFilters";
import { BacklogTable } from "@/components/backlog/BacklogTable";
import { OperationalAlerts } from "@/components/backlog/OperationalAlerts";
import { StatusChart } from "@/components/backlog/StatusChart";
import { AgingChart } from "@/components/backlog/AgingChart";
import { TimelineChart } from "@/components/backlog/TimelineChart";
import { SummaryDashboard } from "@/components/backlog/SummaryDashboard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Table2, LayoutGrid } from "lucide-react";

export default function Produtos() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState<"table" | "summary">("table");
  const selectedProduct = "Saúde Simples"; // Por enquanto fixo
  
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
    error,
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

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header with product badge and view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Produtos</h1>
            <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
              <Package className="h-3 w-3" />
              {selectedProduct}
            </Badge>
          </div>
          
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "table" | "summary")}>
            <TabsList className="h-8">
              <TabsTrigger value="table" className="h-7 px-3 text-xs gap-1.5">
                <Table2 className="h-3.5 w-3.5" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="summary" className="h-7 px-3 text-xs gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Resumo
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeView === "table" ? (
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
        ) : (
          <SummaryDashboard tasks={allTasks} />
        )}
      </div>
    </AppLayout>
  );
}
