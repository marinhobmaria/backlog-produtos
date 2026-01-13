import { StatusIndicator } from "./StatusIndicator";
import { ConfigPanel } from "./ConfigPanel";
import { ConnectionStatus, Config } from "@/types";
import { ArrowRightLeft, Zap } from "lucide-react";

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  config: Config;
  onConfigSave: (config: Config) => void;
}

export function Header({ connectionStatus, config, onConfigSave }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-gradient">Sync</span>
                <span className="text-foreground">Hub</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">
                GLPI ↔ ClickUp Integration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 rounded-lg border border-border bg-secondary/50 px-4 py-2">
            <StatusIndicator
              connected={connectionStatus.clickup.connected}
              label="ClickUp"
            />
            <div className="h-4 w-px bg-border" />
            <StatusIndicator
              connected={connectionStatus.glpi.connected}
              label="GLPI"
            />
          </div>

          <ConfigPanel config={config} onSave={onConfigSave} />
        </div>
      </div>
    </header>
  );
}
