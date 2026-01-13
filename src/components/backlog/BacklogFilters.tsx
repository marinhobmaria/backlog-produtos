import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { BacklogFilters as BacklogFiltersType, TaskStatus, TaskPriority, TaskType } from "@/types";
import { Search, Calendar as CalendarIcon, X, Filter, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BacklogFiltersProps {
  filters: BacklogFiltersType;
  updateFilter: <K extends keyof BacklogFiltersType>(key: K, value: BacklogFiltersType[K]) => void;
  resetFilters: () => void;
  filterOptions: {
    assignees: string[];
    squads: string[];
  };
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "pending", label: "Pendente" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baixa" },
];

const typeOptions: { value: TaskType; label: string }[] = [
  { value: "incident", label: "Incidente" },
  { value: "request", label: "Requisição" },
  { value: "problem", label: "Problema" },
  { value: "change", label: "Mudança" },
];

export function BacklogFiltersComponent({
  filters,
  updateFilter,
  resetFilters,
  filterOptions,
}: BacklogFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.type.length > 0 ||
    filters.assignee.length > 0 ||
    filters.squad.length > 0 ||
    filters.startDate ||
    filters.endDate;

  const toggleArrayFilter = <T extends string>(
    key: keyof BacklogFiltersType,
    value: T,
    currentArray: T[]
  ) => {
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as BacklogFiltersType[typeof key]);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Filtros</span>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ID, título ou palavra-chave"
              className="pl-8 h-9"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Período de Abertura</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 flex-1 justify-start text-left font-normal",
                    !filters.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(filters.startDate, "dd/MM/yy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate || undefined}
                  onSelect={(date) => updateFilter("startDate", date || null)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 flex-1 justify-start text-left font-normal",
                    !filters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, "dd/MM/yy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate || undefined}
                  onSelect={(date) => updateFilter("endDate", date || null)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Assignee */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Responsável</Label>
          <Select
            value={filters.assignee[0] || ""}
            onValueChange={(value) => updateFilter("assignee", value ? [value] : [])}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.assignees.map((assignee) => (
                <SelectItem key={assignee} value={assignee}>
                  {assignee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Squad */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Squad</Label>
          <Select
            value={filters.squad[0] || ""}
            onValueChange={(value) => updateFilter("squad", value ? [value] : [])}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.squads.map((squad) => (
                <SelectItem key={squad} value={squad}>
                  {squad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Multi-select badges */}
      <div className="flex flex-wrap gap-4">
        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((status) => (
              <Badge
                key={status.value}
                variant={filters.status.includes(status.value) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleArrayFilter("status", status.value, filters.status)}
              >
                {status.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Prioridade</Label>
          <div className="flex flex-wrap gap-1">
            {priorityOptions.map((priority) => (
              <Badge
                key={priority.value}
                variant={filters.priority.includes(priority.value) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleArrayFilter("priority", priority.value, filters.priority)}
              >
                {priority.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <div className="flex flex-wrap gap-1">
            {typeOptions.map((type) => (
              <Badge
                key={type.value}
                variant={filters.type.includes(type.value) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleArrayFilter("type", type.value, filters.type)}
              >
                {type.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
