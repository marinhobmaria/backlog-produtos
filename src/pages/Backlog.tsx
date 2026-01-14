import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { BacklogFiltersComponent } from "@/components/backlog/BacklogFilters";
import { BacklogTable } from "@/components/backlog/BacklogTable";
import { OperationalAlerts } from "@/components/backlog/OperationalAlerts";
import { StatusChart } from "@/components/backlog/StatusChart";
import { AgingChart } from "@/components/backlog/AgingChart";
import { TimelineChart } from "@/components/backlog/TimelineChart";

export default function Backlog() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
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
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Backlog Operacional</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e acompanhe os tickets do GLPI
          </p>
        </div>

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
        />

        {/* Indicadores - abaixo da tabela */}
        <OperationalAlerts
          alerts={alerts}
          alertsOnly={filters.alertsOnly}
          onToggleAlertsOnly={toggleAlertsOnly}
        />

        {/* Charts Row - Dashboards after indicadores */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatusChart data={statusCounts} onStatusClick={filterByStatus} />
          <AgingChart data={agingBuckets} />
          <TimelineChart data={dailyOpenings} />
        </div>
      </div>
    </AppLayout>
  );
}
