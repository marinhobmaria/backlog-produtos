
# Extração Completa: Regras de Interface, Status, Credenciais GLPI e Views

Este documento contém todo o código e configurações necessários para replicar o sistema de Backlog/Tickets em outro projeto.

---

## 1. ESTRUTURA DE PASTAS NECESSÁRIA

```text
src/
├── types/
│   └── index.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useBacklogData.ts
│   └── useGlpiTickets.ts
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx
│   └── backlog/
│       ├── BacklogTable.tsx
│       ├── BacklogFilters.tsx
│       ├── TaskDetailSheet.tsx
│       ├── StatusChart.tsx
│       ├── AgingChart.tsx
│       ├── TimelineChart.tsx
│       ├── OperationalAlerts.tsx
│       └── SummaryDashboard.tsx
├── pages/
│   ├── Auth.tsx
│   ├── Produtos.tsx (Backlog)
│   ├── Responsaveis.tsx
│   └── Status.tsx
└── integrations/
    └── supabase/
        └── client.ts
supabase/
└── functions/
    └── glpi-tickets/
        └── index.ts
```

---

## 2. TIPOS E INTERFACES (src/types/index.ts)

```typescript
// Configuration types
export interface GLPIConfig {
  url: string;
  appToken: string;
  userToken: string;
}

export interface ClickUpConfig {
  apiKey: string;
  teamId: string;
  webhookId?: string;
}

export interface StatusMapping {
  clickup: string;
  glpi: string;
  glpiCode: number;
}

export interface Config {
  glpi: GLPIConfig;
  clickup: ClickUpConfig;
  mappings: {
    status: StatusMapping[];
  };
}

// Sync types
export type SyncStatus = 'pending' | 'processing' | 'success' | 'error';
export type SyncType = 'create' | 'update';

export interface SyncItem {
  id: string;
  clickupId: string;
  glpiId?: number;
  type: SyncType;
  status: SyncStatus;
  attempts: number;
  data: {
    name: string;
    content: string;
    status: string;
    priority: string;
    assignee?: string;
    customFields: Record<string, unknown>;
  };
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

// Log types
export type LogLevel = 'info' | 'warning' | 'error';
export type LogOperation = 'create' | 'update' | 'sync' | 'webhook' | 'connection';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  operation: LogOperation;
  clickupId?: string;
  glpiId?: number;
  message: string;
  details?: unknown;
}

// Dashboard metrics
export interface SyncMetrics {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  pendingQueue: number;
  successRate: number;
  lastError?: string;
  lastErrorTime?: Date;
}

export interface ConnectionStatus {
  clickup: {
    connected: boolean;
    lastCheck: Date;
    error?: string;
  };
  glpi: {
    connected: boolean;
    lastCheck: Date;
    error?: string;
  };
}

// Chart data
export interface DailySync {
  date: string;
  success: number;
  error: number;
}

// Backlog types
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type TaskType = 'incident' | 'request' | 'problem' | 'change';
export type TaskTag = 'critical' | 'attention' | 'sla_breached' | 'dependency' | 'no_owner' | 'stale';

export interface BacklogTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assignee: string;
  squad: string;
  client: string;
  sector: string;
  product: string;
  tags: TaskTag[];
  openedAt: Date;
  lastUpdatedAt: Date;
  daysSinceLastAction: number;
  slaDeadline?: Date;
  isSlaBreach: boolean;
}

export interface BacklogFilters {
  startDate: Date | null;
  endDate: Date | null;
  status: TaskStatus[];
  assignee: string[];
  squad: string[];
  priority: TaskPriority[];
  type: TaskType[];
  client: string[];
  sector: string[];
  product: string[];
  tags: TaskTag[];
  search: string;
  alertsOnly: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: Omit<BacklogFilters, 'search' | 'alertsOnly'>;
  createdAt: Date;
}

export interface AgingBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  isCritical: boolean;
}

export interface BacklogMetrics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  oldestTask: BacklogTask | null;
  newestTask: BacklogTask | null;
  tasksWithoutAction: number;
  criticalAgingCount: number;
}

export interface BacklogAlerts {
  staleCount: number;
  slaBreachedCount: number;
  noOwnerCount: number;
  criticalCount: number;
}
```

---

## 3. MAPEAMENTOS DE STATUS (Regras de cores e labels)

```typescript
// Configuração de Status
const statusConfig: Record<TaskStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: typeof Circle;
  description: string;
}> = {
  open: { 
    label: "Aberto", 
    color: "bg-blue-500", 
    bgColor: "bg-blue-500/10",
    icon: Circle,
    description: "Aguardando início"
  },
  in_progress: { 
    label: "Em Andamento", 
    color: "bg-amber-500", 
    bgColor: "bg-amber-500/10",
    icon: Loader2,
    description: "Em execução"
  },
  pending: { 
    label: "Pendente", 
    color: "bg-orange-500", 
    bgColor: "bg-orange-500/10",
    icon: Clock,
    description: "Aguardando resposta"
  },
  resolved: { 
    label: "Resolvido", 
    color: "bg-green-500", 
    bgColor: "bg-green-500/10",
    icon: CheckCircle2,
    description: "Solução aplicada"
  },
  closed: { 
    label: "Fechado", 
    color: "bg-gray-400", 
    bgColor: "bg-gray-400/10",
    icon: CheckCircle2,
    description: "Finalizado"
  },
};

// Mapeamento de Status GLPI -> Sistema
const statusNumToString: Record<number, TaskStatus> = {
  1: 'open',        // Novo
  2: 'in_progress', // Em análise
  3: 'in_progress', // Em andamento
  4: 'pending',     // Aguardando
  5: 'resolved',    // Resolvido
  6: 'closed',      // Fechado
};

// Mapeamento de Prioridade GLPI -> Sistema
const priorityNumToString: Record<number, TaskPriority> = {
  1: 'low',    // Muito baixa
  2: 'low',    // Baixa
  3: 'normal', // Média
  4: 'high',   // Alta
  5: 'urgent', // Muito alta
  6: 'urgent', // Crítica
};

// Cores para Badges de Status
const statusColors: Record<TaskStatus, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  pending: "bg-orange-100 text-orange-800 border-orange-200",
  resolved: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-800 border-gray-200",
};

// Cores para Badges de Prioridade
const priorityColors: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-800 border-gray-200",
};

// Tags e suas configurações
const tagConfig: Record<TaskTag, { label: string; color: string; icon: Icon }> = {
  critical: { label: "Crítico", color: "text-red-600", icon: Flame },
  attention: { label: "Atenção", color: "text-amber-600", icon: AlertTriangle },
  sla_breached: { label: "SLA Estourado", color: "text-purple-600", icon: Clock },
  dependency: { label: "Dependência", color: "text-blue-600", icon: Link2 },
  no_owner: { label: "Sem Responsável", color: "text-orange-600", icon: UserX },
  stale: { label: "Parado", color: "text-gray-500", icon: Clock },
};
```

---

## 4. REGRAS DE CORES POR TEMPO DE INATIVIDADE

```typescript
// Função para colorir baseado em dias de inatividade
const getTimeColor = (days: number) => {
  if (days > 14) return "text-destructive"; // Vermelho (crítico)
  if (days > 7) return "text-orange-600";   // Laranja (atenção)
  if (days > 3) return "text-amber-600";    // Âmbar (alerta leve)
  return "text-muted-foreground";           // Cinza (normal)
};

// Regras de destaque de linha na tabela
const getRowHighlight = (task: BacklogTask) => {
  if (task.priority === "urgent" || task.tags.includes("critical")) {
    return "bg-red-50/50 hover:bg-red-50";
  }
  if (task.daysSinceLastAction > 15) {
    return "bg-amber-50/50 hover:bg-amber-50";
  }
  if (task.isSlaBreach) {
    return "bg-purple-50/50 hover:bg-purple-50";
  }
  return "";
};

// Regras para tags automáticas
const generateTags = (task, daysSinceLastAction, priority) => {
  const tags: TaskTag[] = [];
  if (daysSinceLastAction > 7) tags.push('stale');
  if (priority >= 5) tags.push('critical');
  if (daysSinceLastAction > 14) tags.push('attention');
  return tags;
};
```

---

## 5. CONFIGURAÇÃO DO SUPABASE (Secrets necessários)

```text
Secrets necessários no Supabase:
- GLPI_API_URL: URL base da API do GLPI (ex: https://glpi.empresa.com)
- GLPI_APP_TOKEN: Token de aplicação do GLPI
- GLPI_USER_TOKEN: Token de usuário do GLPI
- SUPABASE_URL: URL do projeto Supabase
- SUPABASE_SERVICE_ROLE_KEY: Chave de service role
```

---

## 6. SCHEMA DO BANCO DE DADOS (SQL)

```sql
-- Tabela de tickets do GLPI
CREATE TABLE public.glpi_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glpi_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 3,
  sector TEXT,
  product TEXT,
  client TEXT,
  requester TEXT,
  assigned_to TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  glpi_created_at TIMESTAMPTZ,
  glpi_updated_at TIMESTAMPTZ
);

-- Tabela de histórico de sincronização
CREATE TABLE public.glpi_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true,
  tickets_count INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

-- RLS Policies
ALTER TABLE public.glpi_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glpi_sync_history ENABLE ROW LEVEL SECURITY;

-- Tickets visíveis para todos (SELECT)
CREATE POLICY "Tickets são visíveis para todos" 
  ON public.glpi_tickets FOR SELECT USING (true);

-- Service role pode gerenciar tickets (ALL)
CREATE POLICY "Service role pode gerenciar tickets" 
  ON public.glpi_tickets FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Histórico visível para todos (SELECT)
CREATE POLICY "Histórico visível para todos" 
  ON public.glpi_sync_history FOR SELECT USING (true);

-- Service role pode inserir histórico (INSERT)
CREATE POLICY "Service role pode inserir histórico" 
  ON public.glpi_sync_history FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_glpi_tickets_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_glpi_tickets_updated_at
  BEFORE UPDATE ON public.glpi_tickets
  FOR EACH ROW EXECUTE FUNCTION update_glpi_tickets_updated_at();
```

---

## 7. EDGE FUNCTION GLPI-TICKETS

Ver arquivo completo: `supabase/functions/glpi-tickets/index.ts`

Principais funcionalidades:
- Inicia sessão no GLPI via API REST
- Busca tickets com expand_dropdowns
- Busca histórico/followups dos tickets
- Parseia títulos para extrair Setor, Produto e Cliente
- Salva no banco via upsert
- Registra histórico de sincronização

---

## 8. HOOK useBacklogData (Lógica Central)

Ver arquivo completo: `src/hooks/useBacklogData.ts`

Funcionalidades:
- Fetch de tickets do banco
- Conversão de ticket GLPI -> BacklogTask
- Sincronização com GLPI via Edge Function
- Filtros avançados (status, prioridade, datas, etc.)
- Ordenação primária e secundária
- Paginação
- Cálculo de métricas e alertas
- Buckets de aging
- Timeline de aberturas (30 dias)
- Exportação para CSV/XLS
- Filtros salvos (localStorage)

---

## 9. COMPONENTES DE INTERFACE

### 9.1 BacklogTable
- Tabela com linhas expansíveis (Collapsible)
- Ordenação por coluna
- Paginação configurável (15/25/50/100)
- Botão de exportação
- Clique abre TaskDetailSheet
- Cores de destaque por criticidade

### 9.2 BacklogFilters
- Busca global (ID, título, cliente, responsável)
- Filtros de data (início/fim com Calendar)
- Multi-select dropdowns para cada campo
- Tags clicáveis
- Chips de filtros ativos com remoção
- Salvar/carregar filtros

### 9.3 TaskDetailSheet
- Sheet lateral com detalhes
- Grid de informações (responsável, cliente, setor)
- Datas formatadas em pt-BR
- Descrição parseada (HTML -> texto)
- Histórico de acompanhamentos

### 9.4 Gráficos (Recharts)
- StatusChart: Barras por status, clicável
- AgingChart: Tempo sem ação (normal/crítico)
- TimelineChart: Área de aberturas por dia

### 9.5 OperationalAlerts
- Cards com métricas: Total, Críticas, Paradas, SLA, Sem Responsável
- Botão para filtrar apenas alertas

### 9.6 SummaryDashboard
- Agrupamento por Setor, Produto, Responsável, Status
- Barras de progresso por status
- Cards com contagens

---

## 10. PÁGINAS PRINCIPAIS

### 10.1 Auth.tsx
- Login/Cadastro com tabs
- Seleção de produto obrigatória
- Validação com Zod
- Integração com Supabase Auth

### 10.2 Produtos.tsx (Backlog)
- Três vistas: Tabela, Kanban, Resumo
- Agrupamento por: nenhum, status, setor, cliente, responsável
- Filtros e gráficos

### 10.3 Responsaveis.tsx
- Vista por responsável
- Cards colapsáveis estilo ClickUp
- Estatísticas: tarefas paradas, média de dias

### 10.4 Status.tsx
- Cards de resumo por status no topo
- Cards colapsáveis com tabelas internas
- Vista Kanban alternativa

---

## 11. DEPENDÊNCIAS NECESSÁRIAS

```json
{
  "@supabase/supabase-js": "^2.90.1",
  "@tanstack/react-query": "^5.83.0",
  "@radix-ui/react-collapsible": "^1.1.11",
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-popover": "^1.1.14",
  "@radix-ui/react-scroll-area": "^1.2.9",
  "@radix-ui/react-select": "^2.2.5",
  "@radix-ui/react-tabs": "^1.1.12",
  "@radix-ui/react-checkbox": "^1.3.2",
  "date-fns": "^3.6.0",
  "recharts": "^2.15.4",
  "sonner": "^1.7.4",
  "lucide-react": "^0.462.0",
  "zod": "^3.25.76",
  "react-router-dom": "^6.30.1"
}
```

---

## 12. PASSOS PARA MIGRAÇÃO

1. Copiar `src/types/index.ts` para o novo projeto
2. Configurar Supabase/Cloud com as tabelas SQL
3. Adicionar secrets: GLPI_API_URL, GLPI_APP_TOKEN, GLPI_USER_TOKEN
4. Copiar a Edge Function `glpi-tickets`
5. Copiar hooks: useAuth, useBacklogData
6. Copiar componentes do backlog
7. Copiar páginas: Auth, Produtos, Responsaveis, Status
8. Copiar AppLayout
9. Configurar rotas no App.tsx
10. Instalar dependências faltantes
