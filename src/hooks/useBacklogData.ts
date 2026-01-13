import { useState, useMemo } from "react";
import {
  BacklogTask,
  BacklogFilters,
  BacklogMetrics,
  AgingBucket,
  TaskStatus,
  TaskPriority,
  TaskType,
} from "@/types";
import { subDays, differenceInDays, format, startOfWeek, addDays } from "date-fns";

// Mock data generator
const generateMockTasks = (): BacklogTask[] => {
  const statuses: TaskStatus[] = ["open", "in_progress", "pending", "resolved", "closed"];
  const priorities: TaskPriority[] = ["urgent", "high", "normal", "low"];
  const types: TaskType[] = ["incident", "request", "problem", "change"];
  const assignees = ["João Silva", "Maria Santos", "Pedro Lima", "Ana Costa", "Carlos Oliveira"];
  const squads = ["Infraestrutura", "Desenvolvimento", "Suporte N2", "Segurança", "DevOps"];
  const titles = [
    "Erro ao acessar sistema ERP",
    "Lentidão no servidor de produção",
    "Solicitação de novo usuário",
    "Atualização de permissões",
    "Falha no backup automático",
    "Problema de conectividade VPN",
    "Requisição de equipamento",
    "Incidente de segurança",
    "Manutenção preventiva",
    "Upgrade de licença",
  ];

  const tasks: BacklogTask[] = [];
  const now = new Date();

  for (let i = 1; i <= 150; i++) {
    const openedAt = subDays(now, Math.floor(Math.random() * 60));
    const lastUpdatedAt = subDays(now, Math.floor(Math.random() * 30));
    const daysSinceLastAction = differenceInDays(now, lastUpdatedAt);

    tasks.push({
      id: `GLPI-${String(i).padStart(5, "0")}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      type: types[Math.floor(Math.random() * types.length)],
      assignee: assignees[Math.floor(Math.random() * assignees.length)],
      squad: squads[Math.floor(Math.random() * squads.length)],
      openedAt,
      lastUpdatedAt,
      daysSinceLastAction,
    });
  }

  return tasks;
};

const initialFilters: BacklogFilters = {
  startDate: null,
  endDate: null,
  status: [],
  assignee: [],
  squad: [],
  priority: [],
  type: [],
  search: "",
};

export function useBacklogData() {
  const [allTasks] = useState<BacklogTask[]>(generateMockTasks);
  const [filters, setFilters] = useState<BacklogFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<keyof BacklogTask>("openedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          task.id.toLowerCase().includes(searchLower) ||
          task.title.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allTasks, filters]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredTasks, sortColumn, sortDirection]);

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
      { label: "0-2 dias", min: 0, max: 2, count: 0, isCritical: false },
      { label: "3-7 dias", min: 3, max: 7, count: 0, isCritical: false },
      { label: "8-15 dias", min: 8, max: 15, count: 0, isCritical: true },
      { label: ">15 dias", min: 16, max: Infinity, count: 0, isCritical: true },
    ];

    filteredTasks.forEach((task) => {
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
      assignees: [...new Set(allTasks.map((t) => t.assignee))],
      squads: [...new Set(allTasks.map((t) => t.squad))],
    };
  }, [allTasks]);

  const handleSort = (column: keyof BacklogTask) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const updateFilter = <K extends keyof BacklogFilters>(key: K, value: BacklogFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  const filterByStatus = (status: TaskStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
    setCurrentPage(1);
  };

  return {
    // Data
    tasks: paginatedTasks,
    allFilteredTasks: filteredTasks,
    totalTasks: sortedTasks.length,
    metrics,
    statusCounts,
    agingBuckets,
    dailyOpenings,
    filterOptions,

    // Pagination
    currentPage,
    totalPages,
    pageSize,
    setCurrentPage,

    // Sorting
    sortColumn,
    sortDirection,
    handleSort,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    filterByStatus,
  };
}
