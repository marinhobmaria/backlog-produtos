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
import { BacklogTask, TaskStatus, TaskPriority } from "@/types";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BacklogTableProps {
  tasks: BacklogTask[];
  totalTasks: number;
  currentPage: number;
  totalPages: number;
  sortColumn: keyof BacklogTask;
  sortDirection: "asc" | "desc";
  onSort: (column: keyof BacklogTask) => void;
  onPageChange: (page: number) => void;
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

export function BacklogTable({
  tasks,
  totalTasks,
  currentPage,
  totalPages,
  sortColumn,
  sortDirection,
  onSort,
  onPageChange,
}: BacklogTableProps) {
  const SortHeader = ({
    column,
    label,
  }: {
    column: keyof BacklogTask;
    label: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3 font-medium"
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

  const getAgingClass = (days: number) => {
    if (days > 15) return "text-destructive font-medium";
    if (days > 7) return "text-warning font-medium";
    return "text-muted-foreground";
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
        <Button variant="outline" size="sm" className="h-8">
          <Download className="h-3 w-3 mr-1.5" />
          Exportar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">
                <SortHeader column="id" label="ID" />
              </TableHead>
              <TableHead className="min-w-[200px]">
                <SortHeader column="title" label="Título" />
              </TableHead>
              <TableHead>
                <SortHeader column="status" label="Status" />
              </TableHead>
              <TableHead>
                <SortHeader column="priority" label="Prioridade" />
              </TableHead>
              <TableHead>
                <SortHeader column="assignee" label="Responsável" />
              </TableHead>
              <TableHead>
                <SortHeader column="openedAt" label="Abertura" />
              </TableHead>
              <TableHead>
                <SortHeader column="lastUpdatedAt" label="Última Atualização" />
              </TableHead>
              <TableHead className="text-right">
                <SortHeader column="daysSinceLastAction" label="Tempo sem Ação" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="cursor-pointer">
                <TableCell className="font-mono text-xs">{task.id}</TableCell>
                <TableCell className="font-medium text-sm max-w-[250px] truncate">
                  {task.title}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusColors[task.status])}
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
                <TableCell className="text-sm">{task.assignee}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(task.openedAt, "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(task.lastUpdatedAt, "dd/MM/yyyy")}
                </TableCell>
                <TableCell className={cn("text-right text-sm", getAgingClass(task.daysSinceLastAction))}>
                  {task.daysSinceLastAction} dia{task.daysSinceLastAction !== 1 ? "s" : ""}
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t border-border">
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
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
