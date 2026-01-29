import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BacklogTask, TaskStatus } from "@/types";
import { Building2, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryDashboardProps {
  tasks: BacklogTask[];
}

interface GroupCount {
  name: string;
  total: number;
  byStatus: Record<TaskStatus, number>;
  activeCount: number;
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

export function SummaryDashboard({ tasks }: SummaryDashboardProps) {
  const sectorCounts = useMemo(() => {
    const counts = new Map<string, GroupCount>();
    
    tasks.forEach((task) => {
      const sector = task.sector || "Sem Setor";
      if (!counts.has(sector)) {
        counts.set(sector, {
          name: sector,
          total: 0,
          byStatus: { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 },
          activeCount: 0,
        });
      }
      const group = counts.get(sector)!;
      group.total++;
      group.byStatus[task.status]++;
      if (task.status !== "closed" && task.status !== "resolved") {
        group.activeCount++;
      }
    });

    return Array.from(counts.values()).sort((a, b) => b.total - a.total);
  }, [tasks]);

  const productCounts = useMemo(() => {
    const counts = new Map<string, GroupCount>();
    
    tasks.forEach((task) => {
      const product = task.product || "Sem Produto";
      if (!counts.has(product)) {
        counts.set(product, {
          name: product,
          total: 0,
          byStatus: { open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 },
          activeCount: 0,
        });
      }
      const group = counts.get(product)!;
      group.total++;
      group.byStatus[task.status]++;
      if (task.status !== "closed" && task.status !== "resolved") {
        group.activeCount++;
      }
    });

    return Array.from(counts.values()).sort((a, b) => b.total - a.total);
  }, [tasks]);

  const renderGroupCard = (group: GroupCount, icon: React.ReactNode) => {
    const activePercentage = group.total > 0 
      ? Math.round((group.activeCount / group.total) * 100) 
      : 0;

    return (
      <Card key={group.name} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                {icon}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate" title={group.name}>
                  {group.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.activeCount} ativas de {group.total}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {group.total}
            </Badge>
          </div>

          {/* Status bar */}
          <div className="h-2 rounded-full overflow-hidden flex bg-muted">
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
          <div className="mt-3 flex flex-wrap gap-1">
            {(Object.keys(statusColors) as TaskStatus[]).map((status) => {
              const count = group.byStatus[status];
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total de Tarefas</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Setores</p>
                <p className="text-2xl font-bold">{sectorCounts.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Produtos</p>
                <p className="text-2xl font-bold">{productCounts.length}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Por Setor</h2>
          <Badge variant="outline" className="text-xs">{sectorCounts.length} setores</Badge>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sectorCounts.map((group) => 
            renderGroupCard(group, <Building2 className="h-4 w-4 text-primary" />)
          )}
        </div>
      </div>

      {/* Product Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-purple-600" />
          <h2 className="text-sm font-semibold">Por Produto</h2>
          <Badge variant="outline" className="text-xs">{productCounts.length} produtos</Badge>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productCounts.map((group) => 
            renderGroupCard(group, <Package className="h-4 w-4 text-purple-600" />)
          )}
        </div>
      </div>
    </div>
  );
}
