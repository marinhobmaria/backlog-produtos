import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SyncItem, SyncStatus } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface SyncQueueProps {
  items: SyncItem[];
  onRetry?: (id: string) => void;
}

const statusConfig: Record<SyncStatus, { icon: typeof Clock; variant: "pending" | "warning" | "success" | "error"; label: string }> = {
  pending: { icon: Clock, variant: "pending", label: "Pendente" },
  processing: { icon: Loader2, variant: "warning", label: "Processando" },
  success: { icon: CheckCircle2, variant: "success", label: "Sucesso" },
  error: { icon: XCircle, variant: "error", label: "Erro" },
};

export function SyncQueue({ items, onRetry }: SyncQueueProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Fila de Sincronização
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {items.filter(i => i.status === 'pending').length} pendente(s)
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Processar
        </Button>
      </div>
      <ScrollArea className="h-[280px]">
        <div className="space-y-1 p-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="mb-2 h-8 w-8 text-success/50" />
              <p className="text-sm">Fila vazia</p>
            </div>
          ) : (
            items.map((item) => {
              const config = statusConfig[item.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={item.id}
                  className="rounded-md border border-border/30 bg-background/50 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={`h-4 w-4 ${
                            item.status === "processing" ? "animate-spin" : ""
                          } ${
                            item.status === "success"
                              ? "text-success"
                              : item.status === "error"
                              ? "text-destructive"
                              : item.status === "processing"
                              ? "text-warning"
                              : "text-pending"
                          }`}
                        />
                        <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
                          {item.data.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} className="text-[10px]">
                          {config.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {item.type === "create" ? "Criar" : "Atualizar"}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {item.attempts > 0 && `${item.attempts} tentativas`}
                        </span>
                      </div>
                      {item.error && (
                        <p className="text-[11px] text-destructive truncate">
                          {item.error}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(item.createdAt, "HH:mm", { locale: ptBR })}
                      </span>
                      {item.status === "error" && onRetry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => onRetry(item.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
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
