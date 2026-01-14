import { useState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BacklogTask, TaskStatus, TaskPriority, TaskTag } from "@/types";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, AlertTriangle, Clock, UserX, Flame, Link2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskDetailSheet } from "./TaskDetailSheet";

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
  taskContents?: Record<string, TaskContent>;
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
  taskContents = {},
}: BacklogTableProps) {
  const [selectedTask, setSelectedTask] = useState<BacklogTask | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleRowClick = (task: BacklogTask) => {
    setSelectedTask(task);
    setSheetOpen(true);
  };

  const getTaskContent = (taskId: string) => {
    return taskContents[taskId]?.content;
  };

  const getTaskHistory = (taskId: string) => {
    return taskContents[taskId]?.history || [];
  };
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
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {totalTasks} tarefa{totalTasks !== 1 ? "s" : ""}
        </span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onExport}>
          <Download className="h-3 w-3 mr-1" />
          Exportar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent text-xs">
              <TableHead className="w-[40px] px-2"></TableHead>
              <TableHead className="w-[80px] px-2">
                <SortHeader column="id" label="ID" />
              </TableHead>
              <TableHead className="min-w-[250px] px-2">
                <SortHeader column="title" label="Descrição" />
              </TableHead>
              <TableHead className="w-[100px] px-2">
                <SortHeader column="status" label="Status" />
              </TableHead>
              <TableHead className="w-[80px] px-2">
                <SortHeader column="priority" label="Prioridade" />
              </TableHead>
              <TableHead className="w-[100px] px-2">
                <SortHeader column="sector" label="Setor" />
              </TableHead>
              <TableHead className="w-[120px] px-2">Produto</TableHead>
              <TableHead className="w-[100px] px-2">
                <SortHeader column="assignee" label="Responsável" />
              </TableHead>
              <TableHead className="w-[80px] px-2">
                <SortHeader column="openedAt" label="Abertura" />
              </TableHead>
              <TableHead className="w-[60px] px-2 text-right">
                <SortHeader column="daysSinceLastAction" label="Dias" className="justify-end ml-auto -mr-2" />
              </TableHead>
              <TableHead className="w-[70px] px-2">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const aging = getAgingDisplay(task.daysSinceLastAction);
              const isExpanded = expandedRows.has(task.id);
              const taskContent = getTaskContent(task.id);
              const extendedTask = task as BacklogTask & { product?: string };
              
              return (
                <Collapsible key={task.id} open={isExpanded} asChild>
                  <>
                    <TableRow 
                      className={cn("cursor-pointer text-xs", getRowHighlight(task))}
                    >
                      <TableCell className="px-2">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => toggleRowExpansion(task.id, e)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-mono text-xs px-2" onClick={() => handleRowClick(task)}>
                        {task.id.replace('GLPI-', '')}
                      </TableCell>
                      <TableCell 
                        className="font-medium text-xs px-2 max-w-[250px]" 
                        onClick={() => handleRowClick(task)}
                      >
                        <span className="line-clamp-2">{task.title}</span>
                      </TableCell>
                      <TableCell className="px-2" onClick={() => handleRowClick(task)}>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", statusColors[task.status])}
                        >
                          {statusLabels[task.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2" onClick={() => handleRowClick(task)}>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs px-2" onClick={() => handleRowClick(task)}>
                        {task.sector}
                      </TableCell>
                      <TableCell className="text-xs px-2 text-muted-foreground" onClick={() => handleRowClick(task)}>
                        {extendedTask.product || '-'}
                      </TableCell>
                      <TableCell className="text-xs px-2 truncate max-w-[100px]" title={task.assignee} onClick={() => handleRowClick(task)}>
                        {task.assignee}
                      </TableCell>
                      <TableCell className="text-xs px-2 text-muted-foreground whitespace-nowrap" onClick={() => handleRowClick(task)}>
                        {format(task.openedAt, "dd/MM/yy")}
                      </TableCell>
                      <TableCell className={cn("text-right text-xs px-2", aging.class)} onClick={() => handleRowClick(task)}>
                        {aging.text}
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex items-center gap-0.5">
                          {task.tags.slice(0, 2).map((tag) => {
                            const Icon = tagIcons[tag];
                            return (
                              <span
                                key={tag}
                                title={tagLabels[tag]}
                                className={cn("p-0.5", tagColors[tag])}
                              >
                                <Icon className="h-3 w-3" />
                              </span>
                            );
                          })}
                          {task.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{task.tags.length - 2}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(task);
                            }}
                          >
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30 hover:bg-muted/40">
                        <TableCell colSpan={11} className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">Descrição Completa:</div>
                            <div 
                              className="text-sm prose prose-sm max-w-none bg-background rounded-md p-3 border"
                              dangerouslySetInnerHTML={{ __html: taskContent || task.title }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              );
            })}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
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

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        content={selectedTask ? getTaskContent(selectedTask.id) : undefined}
        history={selectedTask ? getTaskHistory(selectedTask.id) : []}
      />
    </div>
  );
}
