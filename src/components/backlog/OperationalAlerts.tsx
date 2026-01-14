import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BacklogAlerts } from "@/types";
import { AlertTriangle, Clock, UserX, Flame, Filter, TrendingUp, CheckCircle2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtendedAlerts extends BacklogAlerts {
  totalOpen?: number;
  resolvedToday?: number;
  avgAgingDays?: number;
}

interface OperationalAlertsProps {
  alerts: ExtendedAlerts;
  alertsOnly: boolean;
  onToggleAlertsOnly: () => void;
  totalTasks?: number;
  openTasks?: number;
}

export function OperationalAlerts({
  alerts,
  alertsOnly,
  onToggleAlertsOnly,
  totalTasks = 0,
  openTasks = 0,
}: OperationalAlertsProps) {
  const totalAlerts = alerts.staleCount + alerts.slaBreachedCount + alerts.noOwnerCount + alerts.criticalCount;

  const metricItems = [
    {
      icon: ListTodo,
      label: "Total em Aberto",
      count: openTasks,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      isAlert: false,
    },
    {
      icon: Flame,
      label: "Críticas",
      count: alerts.criticalCount,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      isAlert: true,
    },
    {
      icon: Clock,
      label: "Paradas >7d",
      count: alerts.staleCount,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      isAlert: true,
    },
    {
      icon: AlertTriangle,
      label: "SLA Estourado",
      count: alerts.slaBreachedCount,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      isAlert: true,
    },
    {
      icon: UserX,
      label: "Sem Responsável",
      count: alerts.noOwnerCount,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      isAlert: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Indicadores</span>
          {totalAlerts > 0 && (
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {totalAlerts} alerta{totalAlerts !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {totalAlerts > 0 && (
          <Button
            variant={alertsOnly ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={onToggleAlertsOnly}
          >
            <Filter className="h-3 w-3 mr-1" />
            {alertsOnly ? "Mostrando alertas" : "Filtrar alertas"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {metricItems.map((item) => (
          <Card
            key={item.label}
            className={cn(
              "border transition-all hover:shadow-sm",
              item.borderColor,
              item.bgColor,
              item.count === 0 && item.isAlert && "opacity-50"
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn("text-2xl font-bold", item.color)}>
                    {item.count}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    {item.label}
                  </p>
                </div>
                <item.icon className={cn("h-4 w-4 mt-1", item.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
