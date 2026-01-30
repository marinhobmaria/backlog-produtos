import { useState, useMemo, useCallback, useEffect } from "react";
import {
  BacklogTask,
  BacklogFilters,
  BacklogMetrics,
  BacklogAlerts,
  AgingBucket,
  SavedFilter,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskTag,
} from "@/types";
import { subDays, differenceInDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GlpiTicket {
  id: string;
  glpi_id: number;
  title: string;
  description: string | null;
  status: number;
  priority: number;
  sector: string | null;
  product: string | null;
  client: string | null;
  requester: string | null;
  assigned_to: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  glpi_created_at: string | null;
  glpi_updated_at: string | null;
}

const statusNumToString: Record<number, TaskStatus> = {
  1: 'open',
  2: 'in_progress',
  3: 'in_progress',
  4: 'pending',
  5: 'resolved',
  6: 'closed',
};

const priorityNumToString: Record<number, TaskPriority> = {
  1: 'low',
  2: 'low',
  3: 'normal',
  4: 'high',
  5: 'urgent',
  6: 'urgent',
};

interface TaskContent {
  id: string;
  content?: string;
  history?: Array<{
    id: string;
    date: string;
    user: string;
    action: string;
    content?: string;
  }>;
}

const initialFilters: BacklogFilters = {
  startDate: null,
  endDate: null,
  status: [],
  assignee: [],
  squad: [],
  priority: [],
  type: [],
  client: [],
  sector: [],
  product: [],
  tags: [],
  search: "",
  alertsOnly: false,
};

const SAVED_FILTERS_KEY = "backlog_saved_filters";

export function useBacklogData() {
  const [allTasks, setAllTasks] = useState<BacklogTask[]>([]);
  const [taskContents, setTaskContents] = useState<Record<string, TaskContent>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BacklogFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortColumn, setSortColumn] = useState<keyof BacklogTask>("openedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [secondarySortColumn, setSecondarySortColumn] = useState<keyof BacklogTask | null>(null);
  const [secondarySortDirection, setSecondarySortDirection] = useState<"asc" | "desc">("desc");

  // Load saved filters from localStorage
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_FILTERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Convert DB ticket to BacklogTask
  const convertTicketToTask = useCallback((ticket: GlpiTicket): BacklogTask => {
    const openedAt = ticket.glpi_created_at ? new Date(ticket.glpi_created_at) : new Date(ticket.created_at);
    const lastUpdatedAt = ticket.glpi_updated_at ? new Date(ticket.glpi_updated_at) : new Date(ticket.updated_at);
    const now = new Date();
    const daysSinceLastAction = Math.floor((now.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));

    const tags: TaskTag[] = [];
    if (daysSinceLastAction > 7) tags.push('stale');
    if (ticket.priority >= 5) tags.push('critical');
    if (daysSinceLastAction > 14) tags.push('attention');

    return {
      id: `GLPI-${ticket.glpi_id}`,
      title: ticket.title,
      status: statusNumToString[ticket.status] || 'open',
      priority: priorityNumToString[ticket.priority] || 'normal',
      type: (ticket.category as TaskType) || 'incident',
      assignee: ticket.assigned_to || 'Não atribuído',
      squad: 'Suporte',
      client: ticket.client || '',
      sector: ticket.sector || '',
      product: ticket.product || '',
      tags,
      openedAt,
      lastUpdatedAt,
      daysSinceLastAction,
      slaDeadline: ticket.due_date ? new Date(ticket.due_date) : undefined,
      isSlaBreach: daysSinceLastAction > 5,
    };
  }, []);

  // Fetch tickets from Supabase database
  const fetchFromDatabase = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Buscando tickets do banco de dados...");
      const { data, error: dbError } = await supabase
        .from('glpi_tickets')
        .select('*')
        .order('glpi_updated_at', { ascending: false });

      if (dbError) throw dbError;

      if (!data || data.length === 0) {
        console.log("Banco vazio, sincronizando com GLPI...");
        await syncWithGLPI();
        return;
      }

      const tasks = data.map(convertTicketToTask);
      const contents: Record<string, TaskContent> = {};
      data.forEach((ticket: GlpiTicket) => {
        contents[`GLPI-${ticket.glpi_id}`] = {
          id: `GLPI-${ticket.glpi_id}`,
          content: ticket.description || '',
          history: [],
        };
      });

      setAllTasks(tasks);
      setTaskContents(contents);
      console.log(`${tasks.length} tickets carregados do banco`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      console.error("Erro ao buscar do banco:", err);
    } finally {
      setIsLoading(false);
    }
  }, [convertTicketToTask]);

  // Sync with GLPI (calls edge function which saves to DB)
  const syncWithGLPI = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      console.log("Sincronizando com GLPI...");
      const { data, error: invokeError } = await supabase.functions.invoke("glpi-tickets");
      
      if (invokeError) throw new Error(invokeError.message);
      if (!data.success) throw new Error(data.error || "Erro ao sincronizar");

      toast.success(`${data.saved || data.total} tickets sincronizados`);
      
      // Reload from database after sync
      await fetchFromDatabase();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      toast.error(`Erro ao sincronizar: ${errorMessage}`);
      console.error("Erro ao sincronizar:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchFromDatabase]);

  // Refetch triggers a new sync with GLPI
  const refetch = useCallback(() => syncWithGLPI(), [syncWithGLPI]);

  // Fetch from database on mount
  useEffect(() => {
    fetchFromDatabase();
  }, [fetchFromDatabase]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // Date filter
      if (filters.startDate && task.openedAt < filters.startDate) return false;
      if (filters.endDate && task.openedAt > filters.endDate) return false;

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;

      // Assignee filter
      if (filters.assignee.length > 0 && !filters.assignee.includes(task.assignee)) return false;

      // Squad filter
      if (filters.squad.length > 0 && !filters.squad.includes(task.squad)) return false;

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;

      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(task.type)) return false;

      // Client filter
      if (filters.client.length > 0 && !filters.client.includes(task.client)) return false;

      // Sector filter
      if (filters.sector.length > 0 && !filters.sector.includes(task.sector)) return false;

      // Product filter
      if (filters.product.length > 0 && !filters.product.includes(task.product)) return false;

      // Tags filter
      if (filters.tags.length > 0 && !filters.tags.some((tag) => task.tags.includes(tag))) return false;

      // Alerts only filter
      if (filters.alertsOnly) {
        const hasAlert = task.daysSinceLastAction > 7 || task.isSlaBreach || task.assignee === "Sem responsável" || task.assignee === "Não atribuído";
        if (!hasAlert) return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          task.id.toLowerCase().includes(searchLower) ||
          task.title.toLowerCase().includes(searchLower) ||
          task.client.toLowerCase().includes(searchLower) ||
          task.assignee.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allTasks, filters]);

  // Sort tasks with primary and secondary sort
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const compareValues = (aVal: unknown, bVal: unknown, direction: "asc" | "desc") => {
        if (aVal instanceof Date && bVal instanceof Date) {
          return direction === "asc"
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          return direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        return 0;
      };

      // Primary sort
      const primaryResult = compareValues(a[sortColumn], b[sortColumn], sortDirection);
      if (primaryResult !== 0 || !secondarySortColumn) return primaryResult;

      // Secondary sort
      return compareValues(a[secondarySortColumn], b[secondarySortColumn], secondarySortDirection);
    });
  }, [filteredTasks, sortColumn, sortDirection, secondarySortColumn, secondarySortDirection]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTasks.slice(start, start + pageSize);
  }, [sortedTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedTasks.length / pageSize);

  // Status counts for chart
  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      open: 0,
      in_progress: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
    };

    filteredTasks.forEach((task) => {
      counts[task.status]++;
    });

    return counts;
  }, [filteredTasks]);

  // Aging buckets
  const agingBuckets: AgingBucket[] = useMemo(() => {
    const buckets = [
      { label: "0-3 dias", min: 0, max: 3, count: 0, isCritical: false },
      { label: "4-7 dias", min: 4, max: 7, count: 0, isCritical: false },
      { label: "8-15 dias", min: 8, max: 15, count: 0, isCritical: true },
      { label: ">15 dias", min: 16, max: Infinity, count: 0, isCritical: true },
    ];

    filteredTasks.forEach((task) => {
      if (task.status === "closed" || task.status === "resolved") return;
      const days = task.daysSinceLastAction;
      for (const bucket of buckets) {
        if (days >= bucket.min && days <= bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    return buckets;
  }, [filteredTasks]);

  // Daily openings for timeline
  const dailyOpenings = useMemo(() => {
    const last30Days: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, "dd/MM");
      const count = filteredTasks.filter(
        (task) => format(task.openedAt, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      ).length;
      last30Days.push({ date: dateStr, count });
    }

    return last30Days;
  }, [filteredTasks]);

  // Alerts calculation
  const alerts: BacklogAlerts = useMemo(() => {
    const openTasks = filteredTasks.filter((t) => t.status !== "closed" && t.status !== "resolved");

    return {
      staleCount: openTasks.filter((t) => t.daysSinceLastAction > 7).length,
      slaBreachedCount: openTasks.filter((t) => t.isSlaBreach).length,
      noOwnerCount: openTasks.filter((t) => t.assignee === "Sem responsável" || t.assignee === "Não atribuído").length,
      criticalCount: openTasks.filter((t) => t.tags.includes("critical")).length,
    };
  }, [filteredTasks]);

  // Metrics for executive dashboard
  const metrics: BacklogMetrics = useMemo(() => {
    const openTasks = allTasks.filter((t) => t.status !== "closed" && t.status !== "resolved");
    const sortedByDate = [...openTasks].sort(
      (a, b) => a.openedAt.getTime() - b.openedAt.getTime()
    );

    const byStatus: Record<TaskStatus, number> = {
      open: 0,
      in_progress: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
    };

    allTasks.forEach((task) => {
      byStatus[task.status]++;
    });

    const tasksWithoutAction = openTasks.filter((t) => t.daysSinceLastAction > 7).length;
    const criticalAgingCount = openTasks.filter((t) => t.daysSinceLastAction > 15).length;

    return {
      total: allTasks.length,
      byStatus,
      oldestTask: sortedByDate[0] || null,
      newestTask: sortedByDate[sortedByDate.length - 1] || null,
      tasksWithoutAction,
      criticalAgingCount,
    };
  }, [allTasks]);

  // Available filter options
  const filterOptions = useMemo(() => {
    return {
      assignees: [...new Set(allTasks.map((t) => t.assignee))].filter(Boolean).sort(),
      squads: [...new Set(allTasks.map((t) => t.squad))].filter(Boolean).sort(),
      clients: [...new Set(allTasks.map((t) => t.client))].filter(Boolean).sort(),
      sectors: [...new Set(allTasks.map((t) => t.sector))].filter(Boolean).sort(),
      products: [...new Set(allTasks.map((t) => t.product))].filter(Boolean).sort(),
    };
  }, [allTasks]);

  const handleSort = useCallback((column: keyof BacklogTask, isSecondary = false) => {
    if (isSecondary) {
      if (secondarySortColumn === column) {
        setSecondarySortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSecondarySortColumn(column);
        setSecondarySortDirection("desc");
      }
    } else {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column);
        setSortDirection("desc");
      }
    }
  }, [sortColumn, secondarySortColumn]);

  const updateFilter = useCallback(<K extends keyof BacklogFilters>(key: K, value: BacklogFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setCurrentPage(1);
  }, []);

  const filterByStatus = useCallback((status: TaskStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
    setCurrentPage(1);
  }, []);

  const filterByTag = useCallback((tag: TaskTag) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
    setCurrentPage(1);
  }, []);

  const toggleAlertsOnly = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      alertsOnly: !prev.alertsOnly,
    }));
    setCurrentPage(1);
  }, []);

  const saveCurrentFilter = useCallback((name: string) => {
    const { search, alertsOnly, ...filtersToSave } = filters;
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name,
      filters: filtersToSave,
      createdAt: new Date(),
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
  }, [filters, savedFilters]);

  const loadSavedFilter = useCallback((filterId: string) => {
    const saved = savedFilters.find((f) => f.id === filterId);
    if (saved) {
      setFilters({ ...saved.filters, search: filters.search, alertsOnly: false });
      setCurrentPage(1);
    }
  }, [savedFilters, filters.search]);

  const deleteSavedFilter = useCallback((filterId: string) => {
    const updated = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
  }, [savedFilters]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.status.length > 0 ||
      filters.priority.length > 0 ||
      filters.type.length > 0 ||
      filters.assignee.length > 0 ||
      filters.squad.length > 0 ||
      filters.client.length > 0 ||
      filters.sector.length > 0 ||
      filters.tags.length > 0 ||
      filters.startDate !== null ||
      filters.endDate !== null ||
      filters.alertsOnly
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.type.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.squad.length > 0) count++;
    if (filters.client.length > 0) count++;
    if (filters.sector.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.alertsOnly) count++;
    return count;
  }, [filters]);

  // Export function
  const exportToXLS = useCallback(() => {
    const headers = [
      "ID",
      "Descrição",
      "Status",
      "Prioridade",
      "Cliente",
      "Responsável",
      "Setor",
      "Data Abertura",
      "Última Atualização",
      "Dias sem Ação",
      "Tags",
    ];

    const statusLabels: Record<TaskStatus, string> = {
      open: "Aberto",
      in_progress: "Em Andamento",
      pending: "Pendente",
      resolved: "Resolvido",
      closed: "Fechado",
    };

    const priorityLabels: Record<TaskPriority, string> = {
      urgent: "Urgente",
      high: "Alta",
      normal: "Normal",
      low: "Baixa",
    };

    const tagLabels: Record<TaskTag, string> = {
      critical: "Crítico",
      attention: "Atenção",
      sla_breached: "SLA Estourado",
      dependency: "Dependência",
      no_owner: "Sem Responsável",
      stale: "Parado",
    };

    const rows = sortedTasks.map((task) => [
      task.id,
      task.title,
      statusLabels[task.status],
      priorityLabels[task.priority],
      task.client,
      task.assignee,
      task.sector,
      format(task.openedAt, "dd/MM/yyyy"),
      format(task.lastUpdatedAt, "dd/MM/yyyy"),
      task.daysSinceLastAction,
      task.tags.map((t) => tagLabels[t]).join(", "),
    ]);

    // Create CSV content (Excel compatible)
    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    // Add BOM for UTF-8
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backlog_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedTasks]);

  return {
    // Data
    tasks: paginatedTasks,
    allTasks,
    allFilteredTasks: filteredTasks,
    totalTasks: sortedTasks.length,
    metrics,
    alerts,
    statusCounts,
    agingBuckets,
    dailyOpenings,
    filterOptions,
    isLoading,
    isSyncing,
    error,
    refetch,
    syncWithGLPI,

    // Pagination
    currentPage,
    totalPages,
    pageSize,
    setCurrentPage,
    setPageSize,

    // Sorting
    sortColumn,
    sortDirection,
    secondarySortColumn,
    secondarySortDirection,
    handleSort,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    filterByStatus,
    filterByTag,
    toggleAlertsOnly,
    hasActiveFilters,
    activeFilterCount,

    // Saved filters
    savedFilters,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter,

    // Export
    exportToXLS,

    // Task contents for detail view
    taskContents,
  };
}
