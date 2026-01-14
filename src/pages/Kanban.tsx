import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBacklogData } from "@/hooks/useBacklogData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Clock, User, AlertTriangle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { BacklogTask, TaskStatus } from "@/types";
import { TaskDetailSheet } from "@/components/backlog/TaskDetailSheet";

// Mapeamento de status para colunas do Kanban
const KANBAN_COLUMNS = [
  {
    id: "todo",
    title: "A Fazer",
    statuses: ["open", "pending"] as TaskStatus[],
    color: "bg-amber-500",
  },
  {
    id: "doing",
    title: "Fazendo",
    statuses: ["in_progress"] as TaskStatus[],
    color: "bg-blue-500",
  },
  {
    id: "done",
    title: "Feito",
    statuses: ["resolved", "closed"] as TaskStatus[],
    color: "bg-emerald-500",
  },
];

const priorityColors: Record<string, string> = {
  urgent: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  high: "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
  normal: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
  low: "border-l-slate-400 bg-slate-50 dark:bg-slate-800/20",
};

interface KanbanCardProps {
  task: BacklogTask;
  content?: string;
  onOpenDetail: () => void;
}

function KanbanCard({ task, content, onOpenDetail }: KanbanCardProps) {
  return (
    <Card
      onClick={onOpenDetail}
      className={cn(
        "cursor-pointer border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5",
        priorityColors[task.priority] || priorityColors.normal
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* ID e Tags */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
            {task.id}
          </Badge>
          <div className="flex gap-1">
            {task.tags.includes("stale") && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                <Clock className="h-2.5 w-2.5 mr-0.5" />
                Parado
              </Badge>
            )}
            {task.tags.includes("critical") && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                Crítico
              </Badge>
            )}
          </div>
        </div>

        {/* Título */}
        <p className="text-sm font-medium line-clamp-2">{task.title}</p>

        {/* Metadados */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">{task.assignee}</span>
          </div>
          <span>{task.daysSinceLastAction}d</span>
        </div>

        {/* Cliente */}
        <div className="text-[10px] text-muted-foreground truncate">
          {task.client}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Kanban() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<BacklogTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const selectedProduct = localStorage.getItem("selectedProduct") || "Saúde Simples";

  const { tasks, isLoading, refetch, taskContents } = useBacklogData();

  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  // Agrupar tarefas por coluna
  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map((column) => ({
      ...column,
      tasks: tasks.filter((task) => column.statuses.includes(task.status)),
    }));
  }, [tasks]);

  const handleOpenDetail = (task: BacklogTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  return (
    <AppLayout onRefresh={handleRefresh} isRefreshing={isLoading} lastUpdated={lastUpdated}>
      <div className="w-full px-3 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">Kanban</h1>
          <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
            <Package className="h-3 w-3" />
            {selectedProduct}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {tasks.length} tarefas
          </Badge>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-3 gap-3 h-[calc(100vh-140px)]">
          {columns.map((column) => (
            <Card key={column.id} className="flex flex-col h-full">
              <CardHeader className="py-2 px-3 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", column.color)} />
                    <CardTitle className="text-sm font-semibold">{column.title}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {column.tasks.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-2">
                  <div className="space-y-2">
                    {column.tasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        content={taskContents[task.id]?.content}
                        onOpenDetail={() => handleOpenDetail(task)}
                      />
                    ))}
                    {column.tasks.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        Nenhuma tarefa
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        content={selectedTask ? taskContents[selectedTask.id]?.content : undefined}
        history={selectedTask ? taskContents[selectedTask.id]?.history : undefined}
      />
    </AppLayout>
  );
}
