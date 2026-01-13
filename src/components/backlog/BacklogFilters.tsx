import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BacklogFilters as BacklogFiltersType, TaskStatus, TaskPriority, TaskType, TaskTag, SavedFilter } from "@/types";
import {
  Search,
  Calendar as CalendarIcon,
  X,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Save,
  Bookmark,
  Trash2,
} from "lucide-react";
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
    clients: string[];
    sectors: string[];
  };
  hasActiveFilters: boolean;
  activeFilterCount: number;
  savedFilters: SavedFilter[];
  saveCurrentFilter: (name: string) => void;
  loadSavedFilter: (filterId: string) => void;
  deleteSavedFilter: (filterId: string) => void;
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

const tagOptions: { value: TaskTag; label: string; color: string }[] = [
  { value: "critical", label: "Crítico", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "attention", label: "Atenção", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "sla_breached", label: "SLA Estourado", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "dependency", label: "Dependência", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "no_owner", label: "Sem Responsável", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "stale", label: "Parado", color: "bg-gray-100 text-gray-800 border-gray-200" },
];

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function MultiSelectDropdown({ label, options, selected, onChange, placeholder = "Selecionar..." }: MultiSelectDropdownProps) {
  const [search, setSearch] = useState("");
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 justify-between font-normal w-full",
            selected.length > 0 && "border-primary"
          )}
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
              ? selected[0]
              : `${selected.length} selecionados`}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[180px]">
          <div className="p-2 space-y-1">
            {filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selected, option]);
                    } else {
                      onChange(selected.filter((s) => s !== option));
                    }
                  }}
                />
                <span className="truncate">{option}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum resultado
              </p>
            )}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onChange([])}
            >
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function BacklogFiltersComponent({
  filters,
  updateFilter,
  resetFilters,
  filterOptions,
  hasActiveFilters,
  activeFilterCount,
  savedFilters,
  saveCurrentFilter,
  loadSavedFilter,
  deleteSavedFilter,
}: BacklogFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

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

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      saveCurrentFilter(filterName.trim());
      setFilterName("");
      setSaveDialogOpen(false);
    }
  };

  const getActiveFilterChips = () => {
    const chips: { label: string; onRemove: () => void }[] = [];

    if (filters.startDate || filters.endDate) {
      const label = filters.startDate && filters.endDate
        ? `${format(filters.startDate, "dd/MM")} - ${format(filters.endDate, "dd/MM")}`
        : filters.startDate
        ? `A partir de ${format(filters.startDate, "dd/MM")}`
        : `Até ${format(filters.endDate!, "dd/MM")}`;
      chips.push({ label, onRemove: () => { updateFilter("startDate", null); updateFilter("endDate", null); } });
    }

    filters.status.forEach((s) => {
      const opt = statusOptions.find((o) => o.value === s);
      if (opt) chips.push({ label: opt.label, onRemove: () => toggleArrayFilter("status", s, filters.status) });
    });

    filters.priority.forEach((p) => {
      const opt = priorityOptions.find((o) => o.value === p);
      if (opt) chips.push({ label: opt.label, onRemove: () => toggleArrayFilter("priority", p, filters.priority) });
    });

    filters.client.forEach((c) => {
      chips.push({ label: c, onRemove: () => updateFilter("client", filters.client.filter((x) => x !== c)) });
    });

    filters.assignee.forEach((a) => {
      chips.push({ label: a, onRemove: () => updateFilter("assignee", filters.assignee.filter((x) => x !== a)) });
    });

    filters.sector.forEach((s) => {
      chips.push({ label: s, onRemove: () => updateFilter("sector", filters.sector.filter((x) => x !== s)) });
    });

    filters.tags.forEach((t) => {
      const opt = tagOptions.find((o) => o.value === t);
      if (opt) chips.push({ label: opt.label, onRemove: () => toggleArrayFilter("tags", t, filters.tags) });
    });

    if (filters.alertsOnly) {
      chips.push({ label: "Apenas Alertas", onRemove: () => updateFilter("alertsOnly", false) });
    }

    return chips;
  };

  const activeChips = getActiveFilterChips();

  return (
    <div className="rounded-xl border border-border bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium text-sm">Filtros</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            {/* Saved Filters */}
            {savedFilters.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                    Filtros Salvos
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="end">
                  <ScrollArea className="max-h-[200px]">
                    <div className="p-2 space-y-1">
                      {savedFilters.map((sf) => (
                        <div
                          key={sf.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted group"
                        >
                          <button
                            onClick={() => loadSavedFilter(sf.id)}
                            className="text-sm text-left flex-1 truncate"
                          >
                            {sf.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteSavedFilter(sf.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}

            {/* Save Filter Dialog */}
            {hasActiveFilters && (
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Salvar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Salvar Filtro</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="filterName" className="text-sm">
                      Nome do filtro
                    </Label>
                    <Input
                      id="filterName"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Ex: Meu backlog, Críticos do Setor X"
                      className="mt-1.5"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="p-4 space-y-4">
            {/* Search Row */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Buscar (ID, título, cliente, responsável)</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite para buscar..."
                    className="pl-8 h-9"
                    value={filters.search}
                    onChange={(e) => updateFilter("search", e.target.value)}
                  />
                  {filters.search && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => updateFilter("search", "")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "Selecionar"}
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "Selecionar"}
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

            {/* Multi-select dropdowns row */}
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <MultiSelectDropdown
                  label="Status"
                  options={statusOptions.map((o) => o.label)}
                  selected={filters.status.map((s) => statusOptions.find((o) => o.value === s)?.label || "")}
                  onChange={(labels) => {
                    const values = labels.map((l) => statusOptions.find((o) => o.label === l)?.value).filter(Boolean) as TaskStatus[];
                    updateFilter("status", values);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                <MultiSelectDropdown
                  label="Prioridade"
                  options={priorityOptions.map((o) => o.label)}
                  selected={filters.priority.map((p) => priorityOptions.find((o) => o.value === p)?.label || "")}
                  onChange={(labels) => {
                    const values = labels.map((l) => priorityOptions.find((o) => o.label === l)?.value).filter(Boolean) as TaskPriority[];
                    updateFilter("priority", values);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cliente</Label>
                <MultiSelectDropdown
                  label="Cliente"
                  options={filterOptions.clients}
                  selected={filters.client}
                  onChange={(value) => updateFilter("client", value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Responsável</Label>
                <MultiSelectDropdown
                  label="Responsável"
                  options={filterOptions.assignees}
                  selected={filters.assignee}
                  onChange={(value) => updateFilter("assignee", value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Setor</Label>
                <MultiSelectDropdown
                  label="Setor"
                  options={filterOptions.sectors}
                  selected={filters.sector}
                  onChange={(value) => updateFilter("sector", value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <MultiSelectDropdown
                  label="Tipo"
                  options={typeOptions.map((o) => o.label)}
                  selected={filters.type.map((t) => typeOptions.find((o) => o.value === t)?.label || "")}
                  onChange={(labels) => {
                    const values = labels.map((l) => typeOptions.find((o) => o.label === l)?.value).filter(Boolean) as TaskType[];
                    updateFilter("type", values);
                  }}
                />
              </div>
            </div>

            {/* Tags row */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {tagOptions.map((tag) => (
                  <Badge
                    key={tag.value}
                    variant="outline"
                    className={cn(
                      "cursor-pointer text-xs transition-all",
                      filters.tags.includes(tag.value)
                        ? tag.color
                        : "bg-background hover:bg-muted"
                    )}
                    onClick={() => toggleArrayFilter("tags", tag.value, filters.tags)}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {activeChips.map((chip, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="gap-1 text-xs pl-2 pr-1 py-0.5"
            >
              {chip.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={chip.onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
