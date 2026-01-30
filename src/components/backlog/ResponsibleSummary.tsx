import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BacklogTask, TaskStatus } from "@/types";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsibleSummaryProps {
  tasks: BacklogTask[];
}

const statusColors: Record<TaskStatus, string> = {
  open: "bg-blue-500",
  in_progress: "bg-amber-500",
  pending: "bg-orange-500",
  resolved: "bg-green-500",
  closed: "bg-gray-400",
};

const statusLabels: Record<TaskStatus, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  pending: "Pendente",
  resolved: "Resolvido",
  closed: "Fechado",
};

interface GroupCount {
  name: string;
  total: number;
  byStatus: Record<TaskStatus, number>;
  activeCount: number;
}

export function ResponsibleSummary({ tasks }: ResponsibleSummaryProps) {
  const assigneeCounts = useMemo(() => {
    const counts = new Map<string, GroupCount>();
    
    tasks.forEach((task) => {
      const assignee = task.assignee || "Não Atribuído";
      if (!counts.has(assignee)) {
        counts.set(assignee, {
          name: assignee,
          total: 0,
          byStatus: { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 },
          activeCount: 0,
        });
      }
      const group = counts.get(assignee)!;
      group.total++;
      group.byStatus[task.status]++;
      if (task.status !== "closed" && task.status !== "resolved") {
        group.activeCount++;
      }
    });

    return Array.from(counts.values()).sort((a, b) => b.activeCount - a.activeCount);
  }, [tasks]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Por Responsável</h3>
          <Badge variant="outline" className="text-xs">{assigneeCounts.length} pessoas</Badge>
        </div>
        
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[300px] overflow-y-auto">
          {assigneeCounts.slice(0, 20).map((group) => (
            <div 
              key={group.name} 
              className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="rounded-full bg-teal-100 dark:bg-teal-900/30 p-1.5 shrink-0">
                    <User className="h-3 w-3 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate" title={group.name}>
                      {group.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {group.activeCount} ativas
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px] h-5">
                  {group.total}
                </Badge>
              </div>

              {/* Status bar */}
              <div className="h-1.5 rounded-full overflow-hidden flex bg-muted">
                {(Object.keys(statusColors) as TaskStatus[]).map((status) => {
                  const count = group.byStatus[status];
                  if (count === 0) return null;
                  const width = (count / group.total) * 100;
                  return (
                    <div
                      key={status}
                      className={cn(statusColors[status])}
                      style={{ width: `${width}%` }}
                      title={`${statusLabels[status]}: ${count}`}
                    />
                  );
                })}
              </div>

              {/* Status breakdown */}
              <div className="mt-2 flex flex-wrap gap-1">
                {(Object.keys(statusColors) as TaskStatus[]).map((status) => {
                  const count = group.byStatus[status];
                  if (count === 0) return null;
                  return (
                    <div
                      key={status}
                      className="flex items-center gap-0.5 text-[10px] text-muted-foreground"
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", statusColors[status])} />
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {assigneeCounts.length > 20 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Mostrando 20 de {assigneeCounts.length} responsáveis
          </p>
        )}
      </CardContent>
    </Card>
  );
}
