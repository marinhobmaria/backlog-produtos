import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BacklogTask, TaskStatus, TaskPriority, TaskTag } from "@/types";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, AlertTriangle, Clock, UserX, Flame, Link2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BacklogTableProps {
  tasks: BacklogTask[];
  totalTasks: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  sortColumn: keyof BacklogTask;
  sortDirection: "asc" | "desc";
  onSort: (column: keyof BacklogTask) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onExport: () => void;
}

const statusLabels: Record<TaskStatus, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  pending: "Pendente",
  resolved: "Resolvido",
  closed: "Fechado",
};

const statusColors: Record<TaskStatus, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-orange-100 text-orange-800 border-orange-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityLabels: Record<TaskPriority, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

const priorityColors: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-800 border-gray-200",
};

const tagIcons: Record<TaskTag, React.ElementType> = {
  critical: Flame,
  attention: AlertTriangle,
  sla_breached: Clock,
  dependency: Link2,
  no_owner: UserX,
  stale: Clock,
};

const tagColors: Record<TaskTag, string> = {
  critical: "text-red-600",
  attention: "text-amber-600",
  sla_breached: "text-purple-600",
  dependency: "text-blue-600",
  no_owner: "text-orange-600",
  stale: "text-gray-500",
};

const tagLabels: Record<TaskTag, string> = {
  critical: "Crítico",
  attention: "Atenção",
  sla_breached: "SLA Estourado",
  dependency: "Dependência",
  no_owner: "Sem Responsável",
  stale: "Parado",
};

export function BacklogTable({
  tasks,
  totalTasks,
  currentPage,
  totalPages,
  pageSize,
  sortColumn,
  sortDirection,
  onSort,
  onPageChange,
  onPageSizeChange,
  onExport,
}: BacklogTableProps) {
  const SortHeader = ({
    column,
    label,
    className,
  }: {
    column: keyof BacklogTask;
    label: string;
    className?: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 -ml-3 font-medium", className)}
      onClick={() => onSort(column)}
    >
      {label}
      <ArrowUpDown
        className={cn(
          "ml-1 h-3 w-3",
          sortColumn === column && "text-primary"
        )}
      />
    </Button>
  );

  const getRowHighlight = (task: BacklogTask) => {
    if (task.priority === "urgent" || task.tags.includes("critical")) {
      return "bg-red-50/50 hover:bg-red-50";
    }
    if (task.daysSinceLastAction > 15) {
      return "bg-amber-50/50 hover:bg-amber-50";
    }
    if (task.isSlaBreach) {
      return "bg-purple-50/50 hover:bg-purple-50";
    }
    return "";
  };

  const getAgingDisplay = (days: number) => {
    if (days > 15) {
      return { text: `${days}d`, class: "text-destructive font-bold" };
    }
    if (days > 7) {
      return { text: `${days}d`, class: "text-amber-600 font-medium" };
    }
    return { text: `${days}d`, class: "text-muted-foreground" };
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-sm">Tabela de Backlog</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalTasks} tarefa{totalTasks !== 1 ? "s" : ""} encontrada{totalTasks !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={onExport}>
          <Download className="h-3 w-3 mr-1.5" />
          Exportar XLS
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[90px]">
                <SortHeader column="id" label="ID" />
              </TableHead>
              <TableHead className="min-w-[180px]">
                <SortHeader column="title" label="Descrição" />
              </TableHead>
              <TableHead className="w-[110px]">
                <SortHeader column="status" label="Status" />
              </TableHead>
              <TableHead className="w-[90px]">
                <SortHeader column="priority" label="Prioridade" />
              </TableHead>
              <TableHead className="w-[120px]">
                <SortHeader column="client" label="Cliente" />
              </TableHead>
              <TableHead className="w-[110px]">
                <SortHeader column="assignee" label="Responsável" />
              </TableHead>
              <TableHead className="w-[90px]">
                <SortHeader column="sector" label="Setor" />
              </TableHead>
              <TableHead className="w-[90px]">
                <SortHeader column="openedAt" label="Abertura" />
              </TableHead>
              <TableHead className="w-[70px] text-right">
                <SortHeader column="daysSinceLastAction" label="Parado" className="justify-end ml-auto -mr-3" />
              </TableHead>
              <TableHead className="w-[100px]">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const aging = getAgingDisplay(task.daysSinceLastAction);
              return (
                <TableRow key={task.id} className={cn("cursor-pointer", getRowHighlight(task))}>
                  <TableCell className="font-mono text-xs">{task.id}</TableCell>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate" title={task.title}>
                    {task.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs whitespace-nowrap", statusColors[task.status])}
                    >
                      {statusLabels[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", priorityColors[task.priority])}
                    >
                      {priorityLabels[task.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-[120px]" title={task.client}>
                    {task.client}
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-[110px]" title={task.assignee}>
                    {task.assignee}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.sector}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(task.openedAt, "dd/MM/yy")}
                  </TableCell>
                  <TableCell className={cn("text-right text-sm", aging.class)}>
                    {aging.text}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {task.tags.slice(0, 3).map((tag) => {
                        const Icon = tagIcons[tag];
                        return (
                          <span
                            key={tag}
                            title={tagLabels[tag]}
                            className={cn("p-0.5", tagColors[tag])}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        );
                      })}
                      {task.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground ml-0.5">
                          +{task.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Itens por página:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
