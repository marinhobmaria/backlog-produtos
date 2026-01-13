import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BacklogAlerts } from "@/types";
import { AlertTriangle, Clock, UserX, Flame, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationalAlertsProps {
  alerts: BacklogAlerts;
  alertsOnly: boolean;
  onToggleAlertsOnly: () => void;
}

export function OperationalAlerts({
  alerts,
  alertsOnly,
  onToggleAlertsOnly,
}: OperationalAlertsProps) {
  const totalAlerts = alerts.staleCount + alerts.slaBreachedCount + alerts.noOwnerCount;

  const alertItems = [
    {
      icon: Clock,
      label: "Paradas >7 dias",
      count: alerts.staleCount,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      icon: AlertTriangle,
      label: "SLA Estourado",
      count: alerts.slaBreachedCount,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      icon: UserX,
      label: "Sem Responsável",
      count: alerts.noOwnerCount,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      icon: Flame,
      label: "Críticas",
      count: alerts.criticalCount,
      color: "text-destructive",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ];

  if (totalAlerts === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-sm">Alertas Operacionais</span>
            <span className="text-xs text-muted-foreground">
              ({totalAlerts} tarefa{totalAlerts !== 1 ? "s" : ""} requerem atenção)
            </span>
          </div>
          <Button
            variant={alertsOnly ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={onToggleAlertsOnly}
          >
            <Filter className="h-3 w-3 mr-1" />
            {alertsOnly ? "Mostrando alertas" : "Filtrar alertas"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {alertItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border",
                item.bgColor,
                item.borderColor,
                item.count === 0 && "opacity-50"
              )}
            >
              <item.icon className={cn("h-4 w-4", item.color)} />
              <div>
                <p className={cn("text-lg font-bold leading-none", item.color)}>
                  {item.count}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
