import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BacklogTask, TaskStatus } from "@/types";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusSummaryProps {
  tasks: BacklogTask[];
}

export function StatusSummary({ tasks }: StatusSummaryProps) {
  const statusGroupCounts = useMemo(() => {
    const counts: { status: TaskStatus; label: string; count: number; color: string; bgColor: string }[] = [
      { status: "open", label: "Aberto", count: 0, color: "bg-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
      { status: "in_progress", label: "Em Andamento", count: 0, color: "bg-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
      { status: "pending", label: "Pendente", count: 0, color: "bg-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
      { status: "resolved", label: "Resolvido", count: 0, color: "bg-green-500", bgColor: "bg-green-50 dark:bg-green-950/30" },
      { status: "closed", label: "Fechado", count: 0, color: "bg-gray-400", bgColor: "bg-gray-50 dark:bg-gray-950/30" },
    ];

    tasks.forEach((task) => {
      const statusItem = counts.find((c) => c.status === task.status);
      if (statusItem) {
        statusItem.count++;
      }
    });

    return counts;
  }, [tasks]);

  const activeTasks = tasks.filter(t => t.status !== "closed" && t.status !== "resolved").length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Por Status</h3>
          <Badge variant="outline" className="text-xs">{activeTasks} ativas</Badge>
        </div>
        
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {statusGroupCounts.map((status) => (
            <div 
              key={status.status} 
              className={cn("p-4 rounded-lg border", status.bgColor)}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-3 h-3 rounded-full", status.color)} />
                <span className="text-xs font-medium">{status.label}</span>
              </div>
              
              <p className="text-2xl font-bold">{status.count}</p>
              
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(status.color, "h-full transition-all")}
                  style={{ width: `${tasks.length > 0 ? (status.count / tasks.length) * 100 : 0}%` }}
                />
              </div>
              
              <p className="text-[10px] text-muted-foreground mt-1">
                {tasks.length > 0 ? Math.round((status.count / tasks.length) * 100) : 0}% do total
              </p>
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold ml-1">{tasks.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ativas:</span>
              <span className="font-semibold ml-1 text-amber-600">{activeTasks}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Finalizadas:</span>
              <span className="font-semibold ml-1 text-green-600">{tasks.length - activeTasks}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
