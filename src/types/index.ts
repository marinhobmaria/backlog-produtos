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
