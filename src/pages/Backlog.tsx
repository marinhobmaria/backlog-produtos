import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useBacklogData } from "@/hooks/useBacklogData";
import { BacklogFiltersComponent } from "@/components/backlog/BacklogFilters";
import { BacklogTable } from "@/components/backlog/BacklogTable";
import { OperationalAlerts } from "@/components/backlog/OperationalAlerts";
import { StatusChart } from "@/components/backlog/StatusChart";
import { AgingChart } from "@/components/backlog/AgingChart";
import { TimelineChart } from "@/components/backlog/TimelineChart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, ClipboardList, RefreshCw, Loader2 } from "lucide-react";

export default function Backlog() {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Backlog Operacional</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={refetch}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Atualizar</span>
            </Button>
            <Link to="/dashboard-executivo">
              <Button variant="outline" size="sm" className="h-8">
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                Visão Executiva
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>Dados atualizados automaticamente • Última atualização: agora</p>
        </div>
      </footer>
    </div>
  );
}
