import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogEntry } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
  RefreshCw,
  Webhook,
  Plug2,
} from "lucide-react";

interface ActivityLogProps {
  logs: LogEntry[];
}

const levelIcons = {
  info: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const levelVariants = {
  info: "success" as const,
  warning: "warning" as const,
  error: "error" as const,
};

const operationLabels = {
  create: "Criação",
  update: "Atualização",
  sync: "Sincronização",
  webhook: "Webhook",
  connection: "Conexão",
};

const operationIcons = {
  create: ArrowRightLeft,
  update: RefreshCw,
  sync: RefreshCw,
  webhook: Webhook,
  connection: Plug2,
};

export function ActivityLog({ logs }: ActivityLogProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">
          Atividade Recente
        </h3>
        <Badge variant="secondary" className="text-xs">
          {logs.length} eventos
        </Badge>
      </div>
      <ScrollArea className="h-[320px]">
        <div className="space-y-1 p-2">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma atividade registrada</p>
            </div>
          ) : (
            logs.map((log) => {
              const LevelIcon = levelIcons[log.level];
              const OperationIcon = operationIcons[log.operation];

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-0.5">
                    <LevelIcon
                      className={`h-4 w-4 ${
                        log.level === "info"
                          ? "text-success"
                          : log.level === "warning"
                          ? "text-warning"
                          : "text-destructive"
                      }`}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={levelVariants[log.level]} className="text-[10px] px-1.5 py-0">
                        <OperationIcon className="mr-1 h-2.5 w-2.5" />
                        {operationLabels[log.operation]}
                      </Badge>
                      {log.clickupId && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          CU:{log.clickupId.slice(0, 8)}
                        </span>
                      )}
                      {log.glpiId && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          GLPI:#{log.glpiId}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{log.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(log.timestamp, "dd MMM, HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
