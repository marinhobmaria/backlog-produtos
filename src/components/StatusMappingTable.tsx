import { Badge } from "@/components/ui/badge";
import { StatusMapping } from "@/types";
import { ArrowRight } from "lucide-react";

interface StatusMappingTableProps {
  mappings: StatusMapping[];
}

export function StatusMappingTable({ mappings }: StatusMappingTableProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <div className="border-b border-border/50 px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">
          Mapeamento de Status
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Conversão automática entre ClickUp e GLPI
        </p>
      </div>
      <div className="divide-y divide-border/30">
        {mappings.map((mapping, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="font-mono text-xs min-w-[140px] justify-center">
                {mapping.clickup}
              </Badge>
              <ArrowRight className="h-4 w-4 text-primary" />
              <Badge variant="info" className="font-medium text-xs min-w-[160px] justify-center">
                {mapping.glpi}
              </Badge>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              código: {mapping.glpiCode}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
