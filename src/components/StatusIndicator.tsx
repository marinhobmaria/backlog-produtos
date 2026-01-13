import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  connected: boolean;
  label: string;
  className?: string;
}

export function StatusIndicator({ connected, label, className }: StatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            connected ? "bg-success" : "bg-destructive"
          )}
        />
        {connected && (
          <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-success animate-ping opacity-75" />
        )}
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={cn(
        "text-xs",
        connected ? "text-success" : "text-destructive"
      )}>
        {connected ? "Conectado" : "Desconectado"}
      </span>
    </div>
  );
}
