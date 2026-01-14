import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BacklogTask, TaskStatus, TaskPriority, TaskTag } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  User, 
  Building, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Link2, 
  UserX,
  MessageSquare,
  FileText,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskHistoryItem {
  id: string;
  date: string;
  user: string;
  action: string;
  content?: string;
}

interface TaskDetailSheetProps {
  task: BacklogTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history?: TaskHistoryItem[];
  content?: string;
}

const statusLabels: Record<TaskStatus, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  pending: "Pendente",
  resolved: "Resolvido",
  closed: "Fechado",
};

const statusColors: Record<TaskStatus, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-orange-100 text-orange-800 border-orange-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityLabels: Record<TaskPriority, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

const priorityColors: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-800 border-gray-200",
};

const tagIcons: Record<TaskTag, React.ElementType> = {
  critical: Flame,
  attention: AlertTriangle,
  sla_breached: Clock,
  dependency: Link2,
  no_owner: UserX,
  stale: Clock,
};

const tagColors: Record<TaskTag, string> = {
  critical: "text-red-600 bg-red-50",
  attention: "text-amber-600 bg-amber-50",
  sla_breached: "text-purple-600 bg-purple-50",
  dependency: "text-blue-600 bg-blue-50",
  no_owner: "text-orange-600 bg-orange-50",
  stale: "text-gray-600 bg-gray-50",
};

const tagLabels: Record<TaskTag, string> = {
  critical: "Crítico",
  attention: "Atenção",
  sla_breached: "SLA Estourado",
  dependency: "Dependência",
  no_owner: "Sem Responsável",
  stale: "Parado",
};

export function TaskDetailSheet({ 
  task, 
  open, 
  onOpenChange,
  history = [],
  content 
}: TaskDetailSheetProps) {
  if (!task) return null;

  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Parse HTML content to plain text
  const parseContent = (htmlContent?: string) => {
    if (!htmlContent) return "Sem descrição disponível";
    // Remove HTML tags and decode entities
    const text = htmlContent
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
    return text || "Sem descrição disponível";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <SheetTitle className="text-lg font-semibold leading-tight">
                {task.id}
              </SheetTitle>
              <SheetDescription className="text-base font-medium text-foreground">
                {task.title}
              </SheetDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={cn("text-xs", statusColors[task.status])}>
              {statusLabels[task.status]}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
              {priorityLabels[task.priority]}
            </Badge>
            {task.tags.map((tag) => {
              const Icon = tagIcons[tag];
              return (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn("text-xs gap-1", tagColors[tag])}
                >
                  <Icon className="h-3 w-3" />
                  {tagLabels[tag]}
                </Badge>
              );
            })}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Task Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Responsável:</span>
                <span className="font-medium">{task.assignee}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{task.client}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Setor:</span>
                <span className="font-medium">{task.sector}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Parado há:</span>
                <span className={cn(
                  "font-medium",
                  task.daysSinceLastAction > 15 && "text-destructive",
                  task.daysSinceLastAction > 7 && task.daysSinceLastAction <= 15 && "text-amber-600"
                )}>
                  {task.daysSinceLastAction} dias
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Aberto em:</span>
                <span className="font-medium">{formatDate(task.openedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Última atualização:</span>
                <span className="font-medium">{formatDate(task.lastUpdatedAt)}</span>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Descrição</h3>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {parseContent(content)}
              </div>
            </div>

            <Separator />

            {/* History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Histórico</h3>
              </div>
              
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="border border-border rounded-lg p-3 bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{item.user}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.action}</p>
                      {item.content && (
                        <div className="mt-2 bg-muted/30 rounded p-2 text-sm">
                          {item.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground text-center">
                  Histórico não disponível
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
