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
